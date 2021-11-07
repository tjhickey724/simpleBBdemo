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
const mongoDBremoteURI = 'mongodb+srv://tjhickey:WcaLKkT3JJNiN8dX@cluster0.kgugl.mongodb.net/atlasAuthDemo?retryWrites=true&w=majority'
const mongoDBlocalURI = 'mongodb://localhost/bboard'
const mongodbURI = mongoDBremoteURI

mongoose.connect(mongodbURI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log("we are connected!!!")
  console.log(mongodbURI)
});

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

app.get('/', (req,res) => {
  res.send("This is a simple demo app for CS153a Fall21 at Brandeis!")
})

// This show how middleware works ..
// For any request to '/testmiddleware'
// the app prints three messages and then sends back a message
app.use('/testmiddleware',
  (req,res,next) => {
    console.log('Look, I got called!!!!')
    next()
  },

  (req,res,next) => {
    console.log('Me Too!!!!')
    next()
  },

  (req,res,next) => {
    console.log('Me three !!!!')
    next()
  },

  (req,res) => {
    res.send("This is a middleware test!")
  }

)

// this show how to use res.json to send back a json term
app.get('/hello',
  async (req,res,next) => {
    try{

      res.json({msg:"Hello World",time:new Date()})

    }catch(e){
      console.log(`error in hello ${e}`)
      next(e)
    }
  })

// this shows how to maintain local state on the server
// and send the state to the client, but restarting the server
// resets the state, so it doesn't persist!
let counter = 0
app.get('/counter',
  async (req,res,next) => {
    try{
      counter += 1
      res.json({value:counter,time:new Date()})

    }catch(e){
      next(e)
    }
  })

// here is another example of maintaining local state
// in this case, a list of message,
// as long as the server is not restarted
// we have two routes
//   a get route to return all the messages
//   a post route to add a new message
// restarting the server resets messages to []
// so the messages don't really persist
let messages = []
app.get('/bboard',
  async (req,res,next) => {

    try{

      res.json(messages)

    }catch(e){
      next(e)
    }
  })

app.post('/bboard',
  async (req,res,next) => {
    try{
      let msg = req.body
      messages.push(msg)
      res.json(messages)

    }catch(e){
      next(e)
    }
  })

// this is the template for an asynchronous route
// i.e. one that might access the Database or an API
// and might generate an error!
app.get('/test',
  async (req,res,next) => {
    try {
      res.send('testing')
    } catch(e){
      console.log('error in /test')
      next(e)
    }
})

const User = require('./models/User')

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
      }
      console.log('inside /register with userData=')
      console.dir(userData)
      // delete all the previous user elements with that email
      await User.deleteMany({email:email}) // clean!
      console.log()
      // add this new user document to the collection
      const user = new User(userData) // create document
      await user.save()  // store in collection on db server
      console.log('sending secret back to user')
      // respond to the user, sending them the email and secret
      // they will store it in Async Storage
      // and use it to identify themselves in all future calls
      res.json({email:email, secret:secret})
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
const Post = require('./models/Post')
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
        await Post.find({bboard}).sort({createdAt:-1})
      console.dir(posts)
      res.json(posts)
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
