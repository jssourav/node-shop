const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const {
    check,
    body
} = require('express-validator');

const router = express.Router();

// /admin/add-product => GET
router.get('/add-product', isAuth, adminController.getAddProducts);

// /admin/products => GET
router.get('/products', adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product',
    [
        body('title', 'Please enter a valid Title!')
            .isLength({ min: 4 })
            .trim(),
        body('imageUrl', 'Please enter a valid Image URL!')
            .isURL(),
        body('price', 'Please enter a valid Price!')
            .isFloat("2"),
        body('description', 'Please enter some valid description!')
            .isLength({ min: 5 })
            .trim()
    ],
    isAuth, adminController.postAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product',
    [
        body('title', 'Please enter a valid Title!')
            .isLength({ min: 4 })
            .trim(),
        body('imageUrl', 'Please enter a valid Image URL!')
            .isURL(),
        body('price', 'Please enter a valid Price!')
            .isFloat("2"),
        body('description', 'Please enter some valid description!')
            .isLength({ min: 5 })
            .trim()
    ],
    isAuth, adminController.postEditProduct);

router.post('/delete-product', isAuth, adminController.postDeleteProduct);

module.exports = router;

