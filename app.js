/*
  Simpledemo
  This is a simple Bulletin Board server
  which is designed to interact with a mobile app.
  The mobile app connects with an email
  which we foolishly trust (but this is just in development)
  and the app gets back a "secret"
  It then sends the email and secret in all future interactions.

  The user can add a post to a bulletin board
  and see all of the posts for a bulletin board

  Anyone can post to any board and if the board doesn't exist,
  it will be created.

  The next version will use email to validate that the user
  is who they say they are by sending a code to their email
  If they enter that code, then they are validate, otherwise
  they are not. Only validate users will be able to interact.
*/

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

const mongoose = require( 'mongoose' );
const mongoDBlocalURI = 'mongodb://localhost/bboard'
const mongodbURI = (process.env.MONGODB_URI || mongoDBlocalURI)

mongoose.connect(mongodbURI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("we are connected!!!")
  console.log(mongodbURI)
});

const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const User = require('./models/User')
const Post = require('./models/Post')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cors()); // this is crucial for debugging on web browser
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/testemail',
  async (req,res,next) => {
    try {
      const msg = {
        to: 'timhickey@me.com', // Change to your recipient
        from: 'tjhickey@brandeis.edu', // Change to your verified sender
        subject: 'Testing email from heroku server',
        text: 'if you got this then it worked on '+(new Date()),
        //html: '<strong>and easy to do anywhere, even with Node.js</strong>',
      }
      await sgMail.send(msg)
      console.log('Email sent')
      res.send('sent email!')
    }catch(error){
      next(error)
    }

  })

// the user sends an email and the server
// creates a secret and puts the secret and email
// in the User collection
// the user will use this email and secret in the future
// We do need to validate the email, but haven't yet...
app.post('/register',
  async (req,res,next) => {
    try {
      let email = req.body.email
      // generate a secret
      secret = Math.round(Math.random()*10**7)

      // create a JSON user document
      const userData = {
        email:email,
        secret:secret,
        createdAt: new Date(),
        validated: false,
      }
      console.log('inside /register with userData=')
      console.dir(userData)
      const userList = await User.find({email:email});
      console.log("userList length="+userList.length)
      let user=null;
      if (userList.length==0){
        user = new User(userData) // create document
        await user.save()  // store in collection on db server
        console.log('saving new user data')
      } else {
        user = userList[0]
        console.log('getting userList[0]')
      }
      console.log(`user: ${user.email} ${user.secret}`)

      // respond to the user, sending them the email and secret
      // they will store it in Async Storage
      // and use it to identify themselves in all future calls
      res.json({email:user.email, secret:user.secret, userid:user._id})
      } catch(e){
      next(e)
    }
})

// show all of the users and their secrets!!
// this is not secure, but is used for debugging
// we should really obfuscate the secrets
// by storing only the "salted hash" of secrets in the Database
app.get('/users',
  async (req,res,next) => {
    try {
      const users = await User.find({})
      res.json(users)
    } catch(e){
      next(e)
    }
})


// allow a registered user to add a post to a bulletin board

app.post('/addComment',
  async (req,res,next) => {
    try {
          // credentials of the user
          const email = req.body.email
          const secret = req.body.secret

          // content of the post
          const bboard = req.body.bboard // name of the bboard
          const title = req.body.title
          const text = req.body.text

          // check that the user is who they say they are!
          // if not, then return with an empty response
          // otherwise
          const user = await User.find({email,secret})
          if (user.length==0){
            res.json({result:'no such user',success:false})
          } else {
            const post =
                    {
                      bboard,
                      title,
                      text,
                      createdAt:new Date(),
                      author: user[0].id,
                    }
            console.log('post=')
            console.dir(post)
            const postDoc = new Post(post)
            await postDoc.save()
            res.json({result:'saved post',success:true})
          }
    } catch(e){
      next(e)
    }
})

// show all the posts for all of the bulletin boards
// this is just for debugging
app.get('/allposts',
  async (req,res,next) => {
    try {
      const posts =
        await Post.find({})
      console.dir(posts)
      res.json(posts)
    } catch(e){
      next(e)
    }
})

// show all the posts for one bboard
// this is just for debugging
// we should really only show the N most recent for some small N
app.post('/posts',
  async (req,res,next) => {
    try {
      const bboard = req.body.bboard
      const posts =
        await Post.find({bboard:bboard}).sort({createdAt:-1})
      console.dir(posts)
      res.json(posts)
    } catch(e){
      next(e)
    }
})

app.post('/deletePost',
  async (req,res,next) => {
    try {
      console.log('entering deletePost')
      const email = req.body.email
      const secret = req.body.secret
      const postid = req.body.postid
      console.log('in deletePost')
      const user = await User.findOne({email,secret})
      console.log('found user '+user._id)
      const post =
        await Post.findOne({_id:postid})
      console.log('found post author= '+post.author)
      console.dir(post)
      if (post && user && post.author==user.id) {
        await Post.deleteOne({_id:postid})
        res.json({action:'deleted'})
      } else {
        res.json({action:'failed',msg:'you do not own the post'})
      }
    } catch(e){
      next(e)
    }
})

// how would we find all of the bulletin boards ...
// and send back a list of bboard names?
const getBBoardNames = async (next) => {
  try {
    const bboards = await Post.find({})
       .distinct('bboard')
    return bboards
    // now loop through and get unique bboard names
    // better to use a smarter query
  }catch(e){
    next(e)
  }

}

app.get('/bboardNames',
  async (req,res,next) => {
    try {
      const names =
        await getBBoardNames(next)
      res.json(names)
    } catch(e){
      next(e)
    }
})




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
