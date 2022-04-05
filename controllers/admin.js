const fileHelper = require('../util/file');

const Product = require("../models/product");
const { validationResult } = require('express-validator');


exports.getAddProducts = (req, res, next) => {
    res.render('admin/edit-product', {
        pageTitle: 'Add Products',
        path: '/admin/add-product',
        editing: false,
        hasError: false,
        product: { title: '', imageUrl: '', price: '', description: '' },
        validationErrors: [],
        errorMessage: null
    });
}

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    if (!image) {
        return res.status(422).render('admin/edit-product', {
            path: '/admin/add-product',
            pageTitle: 'Add Products',
            editing: false,
            hasError: true,
            errorMessage: 'Attached file is not an image!',
            product: { title: title, price: price, description: description },
            validationErrors: []
        });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            path: '/admin/add-product',
            pageTitle: 'Add Products',
            editing: false,
            hasError: true,
            errorMessage: errors.array()[0].msg,
            product: { title: title, price: price, description: description },
            validationErrors: errors.array()
        });
    }

    const imageUrl = image.path;

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });
    product.save()
        .then(result => {
            console.log('Created product');
            res.redirect('/admin/products');
        }).catch(err => {
            console.log(err);
            // res.redirect('/500');
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return res.redirect('/');
            }
            res.render('admin/edit-product', {
                pageTitle: 'Edit Products',
                path: '/admin/edit-product',
                editing: editMode,
                product: product,
                hasError: false,
                errorMessage: null
            });
        }).catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
}

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedDescription = req.body.description;
    const image = req.file;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            path: '/admin/edit-product',
            pageTitle: 'Edit Products',
            editing: true,
            hasError: true,
            errorMessage: errors.array()[0].msg,
            product: { title: updatedTitle, price: updatedPrice, description: updatedDescription, _id: prodId },
            validationErrors: errors.array()
        });
    }

    Product.findById(prodId).then(product => {
        if (product.userId.toString() !== req.user._id.toString()) {
            return res.redirect('/');
        }
        product.title = updatedTitle;
        product.price = updatedPrice;
        if (image) {
            fileHelper.deleteFile(product.imageUrl);
            product.imageUrl = image.path;
        }
        product.description = updatedDescription;
        return product.save().then(result => {
            console.log('UPDATED PRODUCT!');
            res.redirect('/admin/products');
        });
    }).catch(err => console.log(err));


}

exports.getProducts = (req, res, next) => {
    Product.find({ userId: req.user._id })
        // // .select('title price')
        // .populate('userId') // .populate('userId', 'name')
        .then(products => {
            console.log(products);
            res.render('admin/products', {
                prods: products,
                pageTitle: 'Admin Products',
                path: '/admin/products',

            });
        }).catch(err => {
            console.log(err);
        });
}

// exports.postDeleteProduct = (req, res, next) => {
//     const prodId = req.body.productId;
//     Product.findById(prodId)
//         .then(product => {
//             if (!product) {
//                 return next(new Error('Product not found!'));
//             }
//             fileHelper.deleteFile(product.imageUrl);
//             return Product.deleteOne({ _id: prodId, userId: req.user._id })
//         })
//         .then(() => {
//             console.log('Destroid PRODUCT!');
//             res.redirect('/admin/products');
//         }).catch(err => console.log(err));
// }

exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            if (!product) {
                return next(new Error('Product not found!'));
            }
            fileHelper.deleteFile(product.imageUrl);
            return Product.deleteOne({ _id: prodId, userId: req.user._id })
        })
        .then(() => {
            console.log('Destroid PRODUCT!');
            res.status(200).json({
                message: 'Success!'
            });
        }).catch(err => {
            res.status(500).json({
                message: 'Deleting product fail!'
            });
        });
}