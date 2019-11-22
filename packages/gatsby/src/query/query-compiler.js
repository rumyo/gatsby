// @flow

/** Query compiler extracts queries and fragments from all files, validates them
 * and then collocates them with fragments they require. This way fragments
 * have global scope and can be used in any other query or fragment.
 */

const _ = require(`lodash`)

const path = require(`path`)
const normalize = require(`normalize-path`)
const glob = require(`glob`)

const {
  validate,
  print,
  visit,
  Kind,
  FragmentsOnCompositeTypesRule,
  KnownTypeNamesRule,
  LoneAnonymousOperationRule,
  PossibleFragmentSpreadsRule,
  ScalarLeafsRule,
  ValuesOfCorrectTypeRule,
  VariablesAreInputTypesRule,
  VariablesInAllowedPositionRule,
} = require(`graphql`)

const getGatsbyDependents = require(`../utils/gatsby-dependents`)
const { store } = require(`../redux`)
const { actions } = require(`../redux/actions/internal`)
const { default: FileParser } = require(`./file-parser`)
const {
  graphqlError,
  multipleRootQueriesError,
  duplicateFragmentError,
  unknownFragmentError,
} = require(`./graphql-errors`)
const report = require(`gatsby-cli/lib/reporter`)
const {
  default: errorParser,
  locInGraphQlToLocInFile,
} = require(`./error-parser`)
const websocketManager = require(`../utils/websocket-manager`)

const overlayErrorID = `graphql-compiler`

export default async function compile({ parentSpan } = {}): Promise<
  Map<string, RootQuery>
> {
  // TODO: swap plugins to themes
  const { program, schema, themes, flattenedPlugins } = store.getState()

  const activity = report.activityTimer(`extract queries from components`, {
    parentSpan,
    id: `query-extraction`,
  })
  activity.start()

  const errors = []
  const addError = errors.push.bind(errors)

  const parsedQueries = await parseQueries({
    base: program.directory,
    additional: resolveThemes(
      themes.themes
        ? themes.themes
        : flattenedPlugins.map(plugin => {
            return {
              themeDir: plugin.pluginFilepath,
            }
          })
    ),
    addError,
    parentSpan,
  })

  const queries = processQueries({
    schema,
    parsedQueries,
    addError,
    parentSpan,
  })

  if (errors.length !== 0) {
    const structuredErrors = activity.panicOnBuild(errors)
    if (process.env.gatsby_executing_command === `develop`) {
      websocketManager.emitError(overlayErrorID, structuredErrors)
    }
  } else {
    if (process.env.gatsby_executing_command === `develop`) {
      // emitError with `null` as 2nd param to clear browser error overlay
      websocketManager.emitError(overlayErrorID, null)
    }
  }
  activity.end()

  return queries
}

export const resolveThemes = (themes = []) =>
  themes.reduce((merged, theme) => {
    merged.push(theme.themeDir)
    return merged
  }, [])

export const parseQueries = async ({
  base,
  additional,
  addError,
  parentSpan,
}) => {
  const filesRegex = `*.+(t|j)s?(x)`
  // Pattern that will be appended to searched directories.
  // It will match any .js, .jsx, .ts, and .tsx files, that are not
  // inside <searched_directory>/node_modules.
  const pathRegex = `/{${filesRegex},!(node_modules)/**/${filesRegex}}`

  const modulesThatUseGatsby = await getGatsbyDependents()

  let files = [
    path.join(base, `src`),
    path.join(base, `.cache`, `fragments`),
    ...additional.map(additional => path.join(additional, `src`)),
    ...modulesThatUseGatsby.map(module => module.path),
  ].reduce((merged, folderPath) => {
    merged.push(
      ...glob.sync(path.join(folderPath, pathRegex), {
        nodir: true,
      })
    )
    return merged
  }, [])

  files = files.filter(d => !d.match(/\.d\.ts$/))

  files = files.map(normalize)

  // We should be able to remove the following and preliminary tests do suggest
  // that they aren't needed anymore since we transpile node_modules now
  // However, there could be some cases (where a page is outside of src for example)
  // that warrant keeping this and removing later once we have more confidence (and tests)

  // Ensure all page components added as they're not necessarily in the
  // pages directory e.g. a plugin could add a page component. Plugins
  // *should* copy their components (if they add a query) to .cache so that
  // our babel plugin to remove the query on building is active.
  // Otherwise the component will throw an error in the browser of
  // "graphql is not defined".
  files = files.concat(
    Array.from(store.getState().components.keys(), c => normalize(c))
  )

  files = _.uniq(files)

  const parser = new FileParser({ parentSpan: parentSpan })

  return await parser.parseFiles(files, addError)
}

export const processQueries = ({
  schema,
  parsedQueries,
  addError,
  parentSpan,
}) => {
  const { definitionsByName, operations } = extractOperations(
    schema,
    parsedQueries,
    addError,
    parentSpan
  )

  return processDefinitions({
    schema,
    operations,
    definitionsByName,
    addError,
    parentSpan,
  })
}

const preValidationRules = [
  LoneAnonymousOperationRule,
  KnownTypeNamesRule,
  FragmentsOnCompositeTypesRule,
  VariablesAreInputTypesRule,
  ScalarLeafsRule,
  PossibleFragmentSpreadsRule,
  ValuesOfCorrectTypeRule,
  VariablesInAllowedPositionRule,
]

const extractOperations = (schema, parsedQueries, addError, parentSpan) => {
  const definitionsByName = new Map()
  const operations = []

  for (const [filePath, doc] of parsedQueries.entries()) {
    const errors = validate(schema, doc, preValidationRules)

    if (errors && errors.length) {
      addError(
        ...errors.map(error => {
          const location = {
            start: locInGraphQlToLocInFile(
              doc.definitions[0].templateLoc,
              error.locations[0]
            ),
          }
          return errorParser({ message: error.message, filePath, location })
        })
      )

      actions.queryExtractionGraphQLError({
        componentPath: filePath,
      })
      continue
    }

    doc.definitions.forEach((def: any) => {
      const name: string = def.name.value
      const text = print(def)
      if (def.kind === Kind.OPERATION_DEFINITION) {
        operations.push(def)
      } else if (def.kind === Kind.FRAGMENT_DEFINITION) {
        if (definitionsByName.has(name)) {
          const otherDef = definitionsByName.get(name)
          if (text !== otherDef.text) {
            addError(
              duplicateFragmentError({
                leftDefinition: {
                  def,
                  filePath,
                  text,
                },
                rightDefinition: otherDef,
              })
            )
            definitionsByName.delete(name)
          }
          return
        }
      }
      definitionsByName.set(name, {
        def,
        filePath,
        text,
        isFragment: def.kind === Kind.FRAGMENT_DEFINITION,
      })
    })
  }
  return {
    definitionsByName,
    operations,
  }
}

const processDefinitions = ({
  schema,
  operations,
  definitionsByName,
  addError,
  parentSpan,
}) => {
  const processedQueries: Queries = new Map()

  const usedFragmentsForFragment = new Map()

  const fragmentNames = Array.from(definitionsByName.entries())
    .filter(([_, def]) => def.isFragment)
    .map(([name, _]) => name)

  for (const operation of operations) {
    const name = operation.name.value
    const originalDefinition = definitionsByName.get(name)
    const filePath = definitionsByName.get(name).filePath
    if (processedQueries.has(filePath)) {
      const otherQuery = processedQueries.get(filePath)

      addError(
        multipleRootQueriesError(
          filePath,
          originalDefinition.def,
          otherQuery && definitionsByName.get(otherQuery.name).def
        )
      )

      actions.queryExtractionGraphQLError({
        componentPath: filePath,
      })
      continue
    }

    const usedFragments = new Set()
    const stack = [operation]
    let missingFragment = false
    while (stack.length > 0) {
      const def = stack.pop(operation)
      visit(def, {
        [Kind.FRAGMENT_SPREAD]: node => {
          const name = node.name.value
          if (usedFragmentsForFragment.has(name)) {
            usedFragmentsForFragment.get(name).forEach(derivedFragmentName => {
              usedFragments.add(derivedFragmentName)
            })
            usedFragments.add(name)
          } else if (definitionsByName.has(name)) {
            stack.push(definitionsByName.get(name).def)
            usedFragments.add(name)
          } else {
            missingFragment = true
            actions.queryExtractionGraphQLError({
              componentPath: filePath,
            })
            addError(
              unknownFragmentError({
                fragmentNames,
                filePath,
                def,
                node,
              })
            )
          }
        },
      })
    }

    if (missingFragment) {
      continue
    }

    const document = {
      kind: Kind.DOCUMENT,
      definitions: Array.from(usedFragments.values())
        .map(name => definitionsByName.get(name).def)
        .concat([operation]),
    }

    const errors = validate(schema, document)
    if (errors && errors.length) {
      for (const error of errors) {
        const { formattedMessage, message } = graphqlError(
          definitionsByName,
          error
        )

        const filePath = originalDefinition.filePath
        actions.queryExtractionGraphQLError({
          componentPath: filePath,
          error: formattedMessage,
        })
        addError(
          errorParser({
            location: locInGraphQlToLocInFile(
              operation.templateLoc,
              error.locations[0]
            ),
            message,
            filePath,
          })
        )
      }
      continue
    }

    const query = {
      name,
      text: print(document),
      originalText: originalDefinition.def.text,
      path: filePath,
      isHook: originalDefinition.def.isHook,
      isStaticQuery: originalDefinition.def.isStaticQuery,
      hash: originalDefinition.def.hash,
    }

    if (query.isStaticQuery) {
      query.id =
        `sq--` +
        _.kebabCase(
          `${path.relative(store.getState().program.directory, filePath)}`
        )
    }

    if (
      query.isHook &&
      process.env.NODE_ENV === `production` &&
      typeof require(`react`).useContext !== `function`
    ) {
      report.panicOnBuild(
        `You're likely using a version of React that doesn't support Hooks\n` +
          `Please update React and ReactDOM to 16.8.0 or later to use the useStaticQuery hook.`
      )
    }

    processedQueries.set(filePath, query)
  }

  return processedQueries
}
