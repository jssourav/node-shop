const express = require('express');
const {
    check,
    body
} = require('express-validator');
const User = require("../models/user");

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);
router.post('/login',
    [
        body('email', 'Please enter a valid email')
            .isEmail()
            .custom((value, { req }) => {
                return User.findOne({ email: value })
                    .then(userDoc => {
                        if (!userDoc) {
                            return Promise.reject('Email not exists!')
                        }
                    });
            }),
        body('password', 'Please enter your password!')
            .notEmpty()
    ],
    authController.postLogin);
router.post('/logout', authController.postLogout);
router.get('/signup', authController.getSignup);
router.post('/signup',
    [
        check('email')
            .isEmail()
            .withMessage('Please Enter a valid email!')
            .normalizeEmail()
            .custom((value, { req }) => {
                // if (value === 'test@test.com') {
                //     throw new Error('This email address is forbiden.')
                // }
                // return true;
                return User.findOne({ email: value })
                    .then(userDoc => {
                        if (userDoc) {
                            return Promise.reject('Email exists already, Please pick a differnt one!')
                        }
                    });
            }),
        body('password', 'Please enter a password with only numbers and text and at least 5 characters')
            .isLength({ min: 5 })
            .isAlphanumeric(),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password have to match!')
            }
            return true;
        })
    ],
    authController.postSignup);
router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);
router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);

module.exports = router;