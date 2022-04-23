require('dotenv').config()
const { ApolloServer, gql, UserInputError } = require('apollo-server');
const { v1: uuid } = require('uuid')
const Book = require('./models/book')
const Author = require('./models/author')
const mongoose = require('mongoose')
const User = require('./models/user')
const jwt = require('jsonwebtoken')

// let authors = [
//     {
//         name: 'Robert Martin',
//         id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
//         born: 1952,
//     },
//     {
//         name: 'Martin Fowler',
//         id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
//         born: 1963
//     },
//     {
//         name: 'Fyodor Dostoevsky',
//         id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
//         born: 1821
//     },
//     {
//         name: 'Joshua Kerievsky', // birthyear not known
//         id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
//     },
//     {
//         name: 'Sandi Metz', // birthyear not known
//         id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
//     },
// ]

// let books = [
//     {
//         title: 'Clean Code',
//         published: 2008,
//         author: 'Robert Martin',
//         id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
//         genres: ['refactoring']
//     },
//     {
//         title: 'Agile software development',
//         published: 2002,
//         author: 'Robert Martin',
//         id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
//         genres: ['agile', 'patterns', 'design']
//     },
//     {
//         title: 'Refactoring, edition 2',
//         published: 2018,
//         author: 'Martin Fowler',
//         id: "afa5de00-344d-11e9-a414-719c6709cf3e",
//         genres: ['refactoring']
//     },
//     {
//         title: 'Refactoring to patterns',
//         published: 2008,
//         author: 'Joshua Kerievsky',
//         id: "afa5de01-344d-11e9-a414-719c6709cf3e",
//         genres: ['refactoring', 'patterns']
//     },
//     {
//         title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
//         published: 2012,
//         author: 'Sandi Metz',
//         id: "afa5de02-344d-11e9-a414-719c6709cf3e",
//         genres: ['refactoring', 'design']
//     },
//     {
//         title: 'Crime and punishment',
//         published: 1866,
//         author: 'Fyodor Dostoevsky',
//         id: "afa5de03-344d-11e9-a414-719c6709cf3e",
//         genres: ['classic', 'crime']
//     },
//     {
//         title: 'The Demon ',
//         published: 1872,
//         author: 'Fyodor Dostoevsky',
//         id: "afa5de04-344d-11e9-a414-719c6709cf3e",
//         genres: ['classic', 'revolution']
//     },
// ]

const typeDefs = gql`
    type User {
    username: String!
    favoriteGenre: String!
    id: ID!
    }
  
type Token {
    value: String!
    }

  type Book {  
      title: String!
      published: Int!
      author: Author!
      id: ID!
      genres: [String!]!
  }

  type Author {
      name: String!
      born: Int
      bookCount: Int!
  }

  type Query {
      authorCount: Int!
      bookCount: Int!
      allBooks(author: String, genre: String): [Book!]!
      allAuthors: [Author!]!
      me: User
  }

  type Mutation{
      addBook(
          title: String!
          author: String!
          published: Int!
          genres: [String!]!
      ): Book

      editAuthor(
        name: String!
        setBornTo: Int!
      ): Author

      createUser(
        username: String!
        favoriteGenre: String!
      ): User

      login(
        username: String!
        password: String!
      ): Token
  }
`

const MONGODB_URI = process.env.MONGODB_URI
console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('connected to MongoDB')
    })
    .catch((error) => {
        console.log('error connection to MongoDB:', error.message)
    })

const resolvers = {
    Query: {
        authorCount: async () => Author.collection.countDocuments(),
        bookCount: async () => Book.collection.countDocuments(),
        allBooks: async (root, args) => {
            if (args.author && args.genre) {
                return Book.find({ 'author.name': args.author, genres: { $in: [args.genre] } }).populate('author')
                // return books.filter(b => b.author === args.author && b.genres.includes(args.genre))
            }
            else if (args.author) {
                return Book.find({ 'author.name': args.author }).populate('author')
                // return books.filter(b => b.author === args.author)
            } else if (args.genre) {
                // return books.filter(b => b.genres.includes(args.genre))
                return Book.find({ genres: { $in: [args.genre] } }).populate('author')
            } else {
                // return books
                return Book.find().populate('author')
            }
        },
        allAuthors: async () => Author.find(),
        me: (root, args, context) => {
            return context.currentUser
          }
    },

    Author: {
        bookCount: async (root) => {
            // const allBooks = books.filter(b => b.author === root.name)
            const allBooks = await Book.find({ 'author.name': root.name }).populate('author')
            return allBooks.length
        }
    },

    Mutation: {
        addBook: async (root, args) => {
            // if (books.find(b => b.title === args.title)) {
            //     throw new UserInputError("Book's title must unique", {
            //         invalidArgs: args.title
            //     })
            //     return null
            // }

            // if (!authors.find(author => author.name === args.author)) {
            //     const author = {
            //         name: args.author,
            //         id: uuid()
            //     }

            //     authors.push(author)
            // }

            const author = new Author({
                name: args.author
            })

            try {
                await author.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }

            const book = new Book({
                ...args,
                author
            })

            try {
                await book.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
            // const book = { ...args, id: uuid() }
            // books.push(book)
            return book
        },

        editAuthor: async (root, args) => {
            // const author = authors.find(author => author.name === args.name)
            const author = await Author.findOne({ name: args.name })
            if (!author) {
                return null
            }
            author.born = args.setBornTo;
            // const updatedAuthor = { ...author, born: args.setBornTo }
            // authors = authors.map(author => author.name !== args.name ? author : updatedAuthor)
            try {
                await author.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
            // return updatedAuthor
            return author
        },

        login: async (root, args) => {
            const user = await User.findOne({ username: args.username })

            if (!user || args.password !== 'akash') {
                throw new UserInputError('Not Authenicated!')
            }

            const userforToken = {
                username: user.username,
                id: user._id
            }

            return { value: jwt.sign(userforToken, process.env.JWT_SECRET) }
        },
       
        createUser: async (root, args) => {
            const user = new User({ ...args })
            try {
                await user.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args
                })
            }
            return user
        }
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
        const auth = req ? req.headers.authorization : null
        if (auth && auth.toLowerCase().startsWith('bearer ')) {
          const decodedToken = jwt.verify(
            auth.substring(7), process.env.JWT_SECRET
          )
          const currentUser = await User.findById(decodedToken.id)
          return { currentUser }
        }
      }
})

server.listen().then(({ url }) => {
    console.log(`Server ready at ${url}`)
})