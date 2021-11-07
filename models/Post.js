'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

var schema = Schema( {
  bboard: String,   // name of the bboard
  title: String,    // title of the post
  text: String,     // full text of the post
  author: ObjectId, // mongodb id of the author
  createdAt: Date,
})

module.exports = mongoose.model( 'CS153aPost', schema );
