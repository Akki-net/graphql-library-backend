const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    title: {
        type: String,
        unique: true,
        required: true,
        minlength: 2
    },
    published: {
        type: Number
    },
    author: {
        ref: mongoose.Schema.Types.ObjectId,
        type: 'Author',
    },
    genres: [
        { type: String }
    ]
})

module.exports = mongoose.model('Book', schema)