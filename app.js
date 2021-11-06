var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(
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

)

app.get('/hello',
  async (req,res,next) => {
    try{

      res.json({msg:"Hello World",time:new Date()})

    }catch(e){
      console.log(`error in hello ${e}`)
      next(e)
    }
  })

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
