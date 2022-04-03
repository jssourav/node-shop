const crypto = require('crypto');
const User = require("../models/user");
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: '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'
  }
}));

function getCookie(cookie, name) {
  const q = {}
  cookie?.replace(/\s/g, '')
    .split(';')
    .map(i => i.split('='))
    .forEach(([key, value]) => {
      q[key] = value;
    });
  return q[name] ?? null;
}

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message.length > 0 ? message[0] : null,
    oldInput: {
      email: "",
      password: ""
    },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email, password: password },
      validationErrors: errors.array()
    });
  }
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password!',
          oldInput: { email: email, password: password },
          validationErrors: []
        });
      }
      bcrypt.compare(password, user.password).then(doMatch => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save((err) => {
            console.log(err);
            res.redirect('/');
          });
        }
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: 'Invalid email or password!',
          oldInput: { email: email, password: password },
          validationErrors: []
        });
      }).catch(err => {
        console.log(err);
        res.redirect('/login')
      });
    })
    .catch(err => { console.log(err); });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: message.length > 0 ? message[0] : null,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: ""
    },
    validationErrors: []
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  // console.log(errors.array());
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email, password: password, confirmPassword: confirmPassword },
      validationErrors: errors.array()
    });
  }
  bcrypt.hash(password, 12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] }
      });
      return user.save();
    })
    .then(result => {
      res.redirect('/login');
      return transporter.sendMail({
        to: email,
        from: 'souravnag.9999@gmail.com',
        subject: 'Signup Succeeded!',
        html: '<h1>You successfully signed up!</h1>'
      });
    })
    .catch(err => console.log(err));
};

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message.length > 0 ? message[0] : null
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          req.flash('error', 'No account with that email found!');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        user.save();
      })
      .then(result => {
        res.redirect('/');
        return transporter.sendMail({
          to: req.body.email,
          from: 'souravnag.9999@gmail.com',
          subject: 'Password Reset!',
          html: `
                <p>You requested a password reset <p>
                <p>click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
            `
        });
      })
      .catch(err => console.log(err));
  })
};


exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message.length > 0 ? message[0] : null,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch(err => console.log(err))
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  }).then(user => {
    resetUser = user;
    return bcrypt.hash(newPassword, 12);
  })
    .then(hashedPassword => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      resetUser.save();
    })
    .then(result => {
      res.redirect('/login');
    })
    .catch(err => console.log(err))
};