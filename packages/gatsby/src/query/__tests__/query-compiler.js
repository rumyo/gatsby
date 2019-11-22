jest.mock(`glob`, () => {
  const sync = jest.fn().mockImplementation(() => [])
  return {
    sync,
  }
})

const { parse, buildSchema, Kind } = require(`graphql`)
const path = require(`path`)
const glob = require(`glob`)
const {
  resolveThemes,
  parseQueries,
  processQueries,
} = require(`../query-compiler`)

const base = path.resolve(``)

describe(`Runner`, () => {
  beforeEach(() => {
    glob.sync.mockClear()
  })

  describe(`expected directories`, () => {
    it(`compiles src directory`, async () => {
      const errors = []
      await parseQueries({
        base,
        additional: [],
        addError: e => {
          errors.push(e)
        },
      })

      expect(errors).toEqual([])

      expect(glob.sync).toHaveBeenCalledWith(
        expect.stringContaining(path.join(base, `src`)),
        expect.any(Object)
      )
    })

    it(`compiles fragments directory`, async () => {
      const errors = []
      await parseQueries({
        base,
        additional: [],
        addError: e => {
          errors.push(e)
        },
      })

      expect(errors).toEqual([])

      expect(glob.sync).toHaveBeenCalledWith(
        expect.stringContaining(path.join(base, `src`)),
        expect.any(Object)
      )
    })

    it(`compiles themes directory(s)`, async () => {
      const theme = `gatsby-theme-whatever`
      const errors = []
      await parseQueries({
        base,
        additional: [path.join(base, `node_modules`, theme)],
        addError: e => {
          errors.push(e)
        },
      })

      expect(errors).toEqual([])

      expect(glob.sync).toHaveBeenCalledWith(
        expect.stringContaining(path.join(base, `node_modules`, theme)),
        expect.any(Object)
      )
    })
  })
})

describe(`resolveThemes`, () => {
  it(`returns empty array if zero themes appear in store`, () => {
    ;[[], undefined].forEach(testRun => {
      expect(resolveThemes(testRun)).toEqual([])
    })
  })

  it(`returns themes in the store`, () => {
    const theme = `gatsby-theme-example`
    expect(
      resolveThemes([
        {
          name: theme,
          themeDir: path.join(base, `gatsby-theme-example`),
        },
      ])
    ).toEqual([expect.stringContaining(theme)])
  })

  it(`handles scoped packages`, () => {
    const theme = `@dschau/gatsby-theme-example`

    expect(
      resolveThemes([
        {
          name: theme,
          themeDir: path.join(base, theme),
        },
      ])
    ).toEqual([expect.stringContaining(theme.split(`/`).join(path.sep))])
  })
})

describe(`actual compiling`, () => {
  let schema
  beforeAll(() => {
    schema = buildSchema(`
      input BooleanQueryOperatorInput {
      eq: Boolean
      ne: Boolean
      in: [Boolean]
      nin: [Boolean]
    }

    scalar Date

    input DateQueryOperatorInput {
      eq: Date
      ne: Date
      gt: Date
      gte: Date
      lt: Date
      lte: Date
      in: [Date]
      nin: [Date]
    }

    type Directory implements Node {
      id: ID!
      parent: Node
      children: [Node!]!
      internal: Internal!
      absolutePath: String
    }

    type DirectoryConnection {
      totalCount: Int!
      edges: [DirectoryEdge!]!
      nodes: [Directory!]!
      pageInfo: PageInfo!
      distinct(field: DirectoryFieldsEnum!): [String!]!
      group(skip: Int, limit: Int, field: DirectoryFieldsEnum!): [DirectoryGroupConnection!]!
    }

    type DirectoryEdge {
      next: Directory
      node: Directory!
      previous: Directory
    }

    enum DirectoryFieldsEnum {
      id
      parent___id
      children
      children___id
      absolutePath
    }

    input DirectoryFilterInput {
      id: StringQueryOperatorInput
      parent: NodeFilterInput
      children: NodeFilterListInput
      internal: InternalFilterInput
      absolutePath: StringQueryOperatorInput
    }

    type DirectoryGroupConnection {
      totalCount: Int!
      edges: [DirectoryEdge!]!
      nodes: [Directory!]!
      pageInfo: PageInfo!
      field: String!
      fieldValue: String
    }

    input DirectorySortInput {
      fields: [DirectoryFieldsEnum]
      order: [SortOrderEnum] = [ASC]
    }

    input DuotoneGradient {
      highlight: String!
      shadow: String!
      opacity: Int
    }

    type File implements Node {
      id: ID!
      parent: Node
      children: [Node!]!
      internal: Internal!
      absolutePath: String
      publicURL: String
    }

    type FileConnection {
      totalCount: Int!
      edges: [FileEdge!]!
      nodes: [File!]!
      pageInfo: PageInfo!
      distinct(field: FileFieldsEnum!): [String!]!
      group(skip: Int, limit: Int, field: FileFieldsEnum!): [FileGroupConnection!]!
    }

    type FileEdge {
      next: File
      node: File!
      previous: File
    }

    enum FileFieldsEnum {
      id
      parent___id
      children___id
      absolutePath
      publicURL
    }

    input FileFilterInput {
      id: StringQueryOperatorInput
      parent: NodeFilterInput
      children: NodeFilterListInput
      internal: InternalFilterInput
      absolutePath: StringQueryOperatorInput
      publicURL: StringQueryOperatorInput
    }

    type FileGroupConnection {
      totalCount: Int!
      edges: [FileEdge!]!
      nodes: [File!]!
      pageInfo: PageInfo!
      field: String!
      fieldValue: String
    }

    input FileSortInput {
      fields: [FileFieldsEnum]
      order: [SortOrderEnum] = [ASC]
    }

    input FloatQueryOperatorInput {
      eq: Float
      ne: Float
      gt: Float
      gte: Float
      lt: Float
      lte: Float
      in: [Float]
      nin: [Float]
    }

    enum ImageCropFocus {
      CENTER
      NORTH
      NORTHEAST
      EAST
      SOUTHEAST
      SOUTH
      SOUTHWEST
      WEST
      NORTHWEST
      ENTROPY
      ATTENTION
    }

    enum ImageFit {
      COVER
      CONTAIN
      FILL
    }

    enum ImageFormat {
      NO_CHANGE
      JPG
      PNG
      WEBP
    }

    type ImageSharp implements Node {
      id: ID!
      fixed(width: Int, height: Int, base64Width: Int, jpegProgressive: Boolean = true, pngCompressionSpeed: Int = 4, grayscale: Boolean = false, duotone: DuotoneGradient, traceSVG: Potrace, quality: Int, toFormat: ImageFormat = NO_CHANGE, toFormatBase64: ImageFormat = NO_CHANGE, cropFocus: ImageCropFocus = ATTENTION, fit: ImageFit = COVER, background: String = "rgba(0,0,0,1)", rotate: Int = 0, trim: Float = 0): ImageSharpFixed
      fluid(
        maxWidth: Int
        maxHeight: Int
        base64Width: Int
        grayscale: Boolean = false
        jpegProgressive: Boolean = true
        pngCompressionSpeed: Int = 4
        duotone: DuotoneGradient
        traceSVG: Potrace
        quality: Int
        toFormat: ImageFormat = NO_CHANGE
        toFormatBase64: ImageFormat = NO_CHANGE
        cropFocus: ImageCropFocus = ATTENTION
        fit: ImageFit = COVER
        background: String = "rgba(0,0,0,1)"
        rotate: Int = 0
        trim: Float = 0
        sizes: String = ""

        # A list of image widths to be generated. Example: [ 200, 340, 520, 890 ]
        srcSetBreakpoints: [Int] = []
      ): ImageSharpFluid

      original: ImageSharpOriginal
      resize(width: Int, height: Int, quality: Int, jpegProgressive: Boolean = true, pngCompressionLevel: Int = 9, pngCompressionSpeed: Int = 4, grayscale: Boolean = false, duotone: DuotoneGradient, base64: Boolean = false, traceSVG: Potrace, toFormat: ImageFormat = NO_CHANGE, cropFocus: ImageCropFocus = ATTENTION, fit: ImageFit = COVER, background: String = "rgba(0,0,0,1)", rotate: Int = 0, trim: Float = 0): ImageSharpResize
      parent: Node
      children: [Node!]!
      internal: Internal!
    }

    type ImageSharpConnection {
      totalCount: Int!
      edges: [ImageSharpEdge!]!
      nodes: [ImageSharp!]!
      pageInfo: PageInfo!
      distinct(field: ImageSharpFieldsEnum!): [String!]!
      group(skip: Int, limit: Int, field: ImageSharpFieldsEnum!): [ImageSharpGroupConnection!]!
    }

    type ImageSharpEdge {
      next: ImageSharp
      node: ImageSharp!
      previous: ImageSharp
    }

    enum ImageSharpFieldsEnum {
      id
      parent
      children
    }

    input ImageSharpFilterInput {
      id: StringQueryOperatorInput
      parent: NodeFilterInput
      children: NodeFilterListInput
      internal: InternalFilterInput
    }

    type ImageSharpFixed {
      base64: String
      tracedSVG: String
      aspectRatio: Float
      width: Float
      height: Float
      src: String
      srcSet: String
      srcWebp: String
      srcSetWebp: String
      originalName: String
    }

    type ImageSharpFluid {
      base64: String
      tracedSVG: String
      aspectRatio: Float
      src: String
      srcSet: String
      srcWebp: String
      srcSetWebp: String
      sizes: String
      originalImg: String
      originalName: String
      presentationWidth: Int
      presentationHeight: Int
    }

    type ImageSharpGroupConnection {
      totalCount: Int!
      edges: [ImageSharpEdge!]!
      nodes: [ImageSharp!]!
      pageInfo: PageInfo!
      field: String!
      fieldValue: String
    }

    type ImageSharpOriginal {
      width: Float
      height: Float
      src: String
    }

    type ImageSharpResize {
      src: String
      tracedSVG: String
      width: Int
      height: Int
      aspectRatio: Float
      originalName: String
    }

    type ImageSharpResolutions {
      base64: String
      tracedSVG: String
      aspectRatio: Float
      width: Float
      height: Float
      src: String
      srcSet: String
      srcWebp: String
      srcSetWebp: String
      originalName: String
    }

    type ImageSharpSizes {
      base64: String
      tracedSVG: String
      aspectRatio: Float
      src: String
      srcSet: String
      srcWebp: String
      srcSetWebp: String
      sizes: String
      originalImg: String
      originalName: String
      presentationWidth: Int
      presentationHeight: Int
    }


    input ImageSharpSortInput {
      fields: [ImageSharpFieldsEnum]
      order: [SortOrderEnum] = [ASC]
    }

    type Internal {
      content: String
      contentDigest: String!
      description: String
      fieldOwners: [String]
      ignoreType: Boolean
      mediaType: String
      owner: String!
      type: String!
    }

    input InternalFilterInput {
      content: StringQueryOperatorInput
      contentDigest: StringQueryOperatorInput
      description: StringQueryOperatorInput
      fieldOwners: StringQueryOperatorInput
      ignoreType: BooleanQueryOperatorInput
      mediaType: StringQueryOperatorInput
      owner: StringQueryOperatorInput
      type: StringQueryOperatorInput
    }

    input IntQueryOperatorInput {
      eq: Int
      ne: Int
      gt: Int
      gte: Int
      lt: Int
      lte: Int
      in: [Int]
      nin: [Int]
    }

    scalar JSON

    # Node Interface
    interface Node {
      id: ID!
      parent: Node
      children: [Node!]!
      internal: Internal!
    }

    input NodeFilterInput {
      id: StringQueryOperatorInput
      parent: NodeFilterInput
      children: NodeFilterListInput
      internal: InternalFilterInput
    }

    input NodeFilterListInput {
      elemMatch: NodeFilterInput
    }

    type PageInfo {
      currentPage: Int!
      hasPreviousPage: Boolean!
      hasNextPage: Boolean!
      itemCount: Int!
      pageCount: Int!
      perPage: Int
    }

    type PostsJson implements Node {
      id: ID!
      parent: Node
      children: [Node!]!
      internal: Internal!
      text: String
      time(
        formatString: String
        fromNow: Boolean
        difference: String
        locale: String
      ): Date
      image: File
    }

    type PostsJsonConnection {
      totalCount: Int!
      edges: [PostsJsonEdge!]!
      nodes: [PostsJson!]!
      pageInfo: PageInfo!
      distinct(field: PostsJsonFieldsEnum!): [String!]!
      group(skip: Int, limit: Int, field: PostsJsonFieldsEnum!): [PostsJsonGroupConnection!]!
    }

    type PostsJsonEdge {
      next: PostsJson
      node: PostsJson!
      previous: PostsJson
    }

    enum PostsJsonFieldsEnum {
      id
      parent___id
      children___id
      time
      text
      image___absolutePath
      image___publicURL
    }

    input PostsJsonFilterInput {
      id: StringQueryOperatorInput
      parent: NodeFilterInput
      children: NodeFilterListInput
      internal: InternalFilterInput
      time: DateQueryOperatorInput
      image: FileFilterInput
    }

    input PostsJsonFilterListInput {
      elemMatch: PostsJsonFilterInput
    }

    type PostsJsonGroupConnection {
      totalCount: Int!
      edges: [PostsJsonEdge!]!
      nodes: [PostsJson!]!
      pageInfo: PageInfo!
      field: String!
      fieldValue: String
    }

    input PostsJsonSortInput {
      fields: [PostsJsonFieldsEnum]
      order: [SortOrderEnum] = [ASC]
    }

    input Potrace {
      turnPolicy: PotraceTurnPolicy
      turdSize: Float
      alphaMax: Float
      optCurve: Boolean
      optTolerance: Float
      threshold: Int
      blackOnWhite: Boolean
      color: String
      background: String
    }

    enum PotraceTurnPolicy {
      TURNPOLICY_BLACK
      TURNPOLICY_WHITE
      TURNPOLICY_LEFT
      TURNPOLICY_RIGHT
      TURNPOLICY_MINORITY
      TURNPOLICY_MAJORITY
    }

    type Query {
      allFile(filter: FileFilterInput, sort: FileSortInput, skip: Int, limit: Int): FileConnection!
      allImageSharp(filter: ImageSharpFilterInput, sort: ImageSharpSortInput, skip: Int, limit: Int): ImageSharpConnection!
      allDirectory(filter: DirectoryFilterInput, sort: DirectorySortInput, skip: Int, limit: Int): DirectoryConnection!
      allPostsJson(filter: PostsJsonFilterInput, sort: PostsJsonSortInput, skip: Int, limit: Int): PostsJsonConnection!
    }

    enum SortOrderEnum {
      ASC
      DESC
    }

    input StringQueryOperatorInput {
      eq: String
      ne: String
      in: [String]
      nin: [String]
      regex: String
      glob: String
    }
  `)
  })

  it(`compiles a query`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 id
               }
            }
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toEqual([])
    expect(result.get(`mockFile`)).toMatchSnapshot()
  })

  it(`compiles static query`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 id
               }
            }
          }`,
          {
            isStaticQuery: true,
          }
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toEqual([])
    expect(result.get(`mockFile`)).toMatchSnapshot({
      id: expect.any(String),
    })
  })

  it(`adds fragments from same documents`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 ...PostsJsonFragment
               }
            }
          }

          fragment PostsJsonFragment on PostsJson {
            id
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toEqual([])
    expect(result.get(`mockFile`)).toMatchSnapshot()
  })

  it(`adds fragments from different documents`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 ...PostsJsonFragment
               }
            }
          }`
        ),
      ],
      [
        `mockComponent`,
        createGatsbyDoc(
          `fragment PostsJsonFragment on PostsJson {
             id
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toEqual([])
    expect(result.get(`mockFile`)).toMatchSnapshot()
  })

  it(`removes unused fragments from documents`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 ...PostsJsonFragment
               }
            }
          }

          fragment PostsJsonFragment on PostsJson {
            id
          }

          fragment UnusedFragment on PostsJson {
            id
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toEqual([])
    expect(result.get(`mockFile`)).toMatchSnapshot()
  })

  it(`errors on unknown fragment`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 ...UnknownFragment
               }
            }
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "context": Object {
            "closestFragment": undefined,
            "codeFrame": "  1 | query mockFileQuery {
        2 |              allPostsJson {
        3 |                nodes {
      > 4 |                  ...UnknownFragment
          |                  ^^^^^^^^^^^^^^^^^^
        5 |                }
        6 |             }
        7 |           }",
            "fragmentName": "UnknownFragment",
          },
          "filePath": "mockFile",
          "id": "85908",
        },
      ]
    `)
    expect(result).toEqual(new Map())
  })

  it(`advices on similarly named fragment`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 ...PostJsonFragment
               }
            }
          }

          fragment PostsJsonFragment on PostsJson {
            id
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })

    expect(errors).toMatchInlineSnapshot(
      `
      Array [
        Object {
          "context": Object {
            "closestFragment": "PostsJsonFragment",
            "codeFrame": "   1 | query mockFileQuery {
         2 |              allPostsJson {
         3 |                nodes {
      >  4 |                  ...PostJsonFragment
           |                  ^^^^^^^^^^^^^^^^^^^
         5 |                }
         6 |             }
         7 |           }
         8 |` +
        ` ` +
        `
         9 |           fragment PostsJsonFragment on PostsJson {
        10 |             id
        11 |           }",
            "fragmentName": "PostJsonFragment",
          },
          "filePath": "mockFile",
          "id": "85908",
        },
      ]
    `
    )
    expect(result).toEqual(new Map())
  })

  it(`accepts identical fragment definitions`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
           allPostsJson {
             nodes {
               ...PostsJsonFragment
             }
          }
        }

        fragment PostsJsonFragment on PostsJson {
          id
        }`
        ),
      ],
      [
        `mockComponent`,
        createGatsbyDoc(
          `fragment PostsJsonFragment on PostsJson {
            id
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toEqual([])
    expect(result).toMatchSnapshot()
  })

  it(`errors on duplicate fragment names`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
           allPostsJson {
             nodes {
               ...PostsJsonFragment
             }
          }
        }

        fragment PostsJsonFragment on PostsJson {
          id
          node
        }`
        ),
      ],
      [
        `mockComponent`,
        createGatsbyDoc(
          `fragment PostsJsonFragment on PostsJson {
            id
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toMatchInlineSnapshot(
      `
      Array [
        Object {
          "context": Object {
            "fragmentName": "",
            "leftFragment": Object {
              "codeFrame": "> 1 | fragment PostsJsonFragment on PostsJson {
          |          ^^^^^^^^^^^^^^^^^
        2 |   id
        3 | }",
              "filePath": "mockComponent",
            },
            "rightFragment": Object {
              "codeFrame": "  1 | fragment PostsJsonFragment on PostsJson {
        2 |   id
        3 |   node
      > 4 | }
          |  ^^^^^^^^^^^^^^^^^",
              "filepath": "mockFile",
            },
          },
          "id": "85919",
        },
        Object {
          "context": Object {
            "closestFragment": undefined,
            "codeFrame": "   1 | query mockFileQuery {
         2 |            allPostsJson {
         3 |              nodes {
      >  4 |                ...PostsJsonFragment
           |                ^^^^^^^^^^^^^^^^^^^^
         5 |              }
         6 |           }
         7 |         }
         8 |` +
        ` ` +
        `
         9 |         fragment PostsJsonFragment on PostsJson {
        10 |           id
        11 |           node
        12 |         }",
            "fragmentName": "PostsJsonFragment",
          },
          "filePath": "mockFile",
          "id": "85908",
        },
      ]
    `
    )
    expect(result).toEqual(new Map())
  })

  it(`errors on wrong type of fragment`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
           allPostsJson {
             nodes {
               ...PostsJsonFragment
             }
          }
        }`
        ),
      ],
      [
        `mockComponent`,
        createGatsbyDoc(
          `fragment PostsJsonFragment on PostsJsonConnection {
          nodes {
            id
          }
        }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "context": Object {
            "sourceMessage": "Fragment \\"PostsJsonFragment\\" cannot be spread here as objects of type \\"PostsJson\\" can never be of type \\"PostsJsonConnection\\".

      GraphQL request:4:16
      3 |              nodes {
      4 |                ...PostsJsonFragment
        |                ^
      5 |              }",
          },
          "filePath": "mockFile",
          "id": "85901",
          "location": Object {
            "column": 16,
            "line": 3,
          },
        },
      ]
    `)
    expect(result).toEqual(new Map())
  })

  it(`errors on double root`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               nodes {
                 id
               }
            }
          }

          query AnotherQuery {
            allPostsJson {
              nodes {
                id
              }
            }
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toMatchInlineSnapshot(
      `
      Array [
        Object {
          "context": Object {
            "afterCodeFrame": "  1 | query anotherQueryAndMockFileQuery {
        2 |   bar {
        3 |     #...
        4 |   }
        5 |   foo {
        6 |     #...
        7 |   }
        8 | }",
            "beforeCodeFrame": "   1 | query mockFileQuery {
         2 |   bar {
         3 |     #...
         4 |   }
         5 | }
         6 |` +
        ` ` +
        `
         7 | query AnotherQuery {
         8 |   foo {
         9 |     #...
        10 |   }
        11 | }",
            "name": "AnotherQuery",
            "otherName": "mockFileQuery",
          },
          "filePath": "mockFile",
          "id": "85910",
        },
      ]
    `
    )
    expect(result).toMatchSnapshot()
  })

  it(`errors on invalid graphql`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query {
             allPostsJson {
               nodes {
                 id
               }
            }
          }

          query {
            allFile {
              nodes {
                id
              }
            }
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "context": Object {
            "sourceMessage": "This anonymous operation must be the only defined operation.",
          },
          "filePath": "mockFile",
          "id": "85901",
          "location": Object {
            "start": Object {
              "column": 1,
              "line": 0,
            },
          },
        },
      ]
    `)
    expect(result).toEqual(new Map())
  })

  it(`errors on schema-aware invalid graphql`, async () => {
    const nodes = new Map()
    ;[
      [
        `mockFile`,
        createGatsbyDoc(
          `query mockFileQuery {
             allPostsJson {
               id
            }
          }`
        ),
      ],
    ].forEach(([fileName, document]) => {
      nodes.set(fileName, document)
    })
    const errors = []
    const result = processQueries({
      schema,
      parsedQueries: nodes,
      addError: e => {
        errors.push(e)
      },
    })
    expect(errors).toMatchInlineSnapshot(`
      Array [
        Object {
          "context": Object {
            "sourceMessage": "Cannot query field \\"id\\" on type \\"PostsJsonConnection\\".

      GraphQL request:3:16
      2 |              allPostsJson {
      3 |                id
        |                ^
      4 |             }",
          },
          "filePath": "mockFile",
          "id": "85901",
          "location": Object {
            "column": 16,
            "line": 2,
          },
        },
      ]
    `)
    expect(result).toEqual(new Map())
  })
})

const createGatsbyDoc = (
  query,
  { isHook, isStaticQuery } = { isHook: false, isStaticQuery: false }
) => {
  const doc = parse(query)
  for (const def of doc.definitions) {
    if (def.kind === Kind.OPERATION_DEFINITION) {
      def.text = query
      def.isHook = isHook
      def.isStaticQuery = isStaticQuery
      def.hash = `hash`
    }
    def.templateLoc = {
      start: {
        line: 0,
        column: 0,
      },
      end: {
        line: 0,
        column: 0,
      },
    }
  }
  return doc
}
