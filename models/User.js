'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
var schema = Schema( {
  email:String,
  createdAt: Date,
  secret: String, // used for validation
} );

module.exports = mongoose.model( 'UserCS153aBB', schema );
