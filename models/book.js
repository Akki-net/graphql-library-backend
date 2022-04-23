const mongoose = require('mongoose')

const schema = new mongoose.Schema({
    title: {
        type: String,
        unique: true,
        required: true,
        minlength: 2
    },
    published: {
        type: Number,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Author'
    },
    genres: [
        { type: String }
    ]
})

module.exports = mongoose.model('Book', schema)