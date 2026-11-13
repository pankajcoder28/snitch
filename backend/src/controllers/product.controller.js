import productModel from "../models/product.model.js"
import { uploadFile } from "../services/storage.service.js";


export const createProduct = async (req,res)=>{
    const{title , description ,priceAmount ,priceCurrency } = req.body

    const seller = req.user;

    const images = await Promise.all(req.files.map((file)=>{
        return  uploadFile({buffer: file.buffer , fileName: file.originalname})
    }))

    const product = await productModel.create({
        title, description , 
        price:{
            amount: priceAmount,
            currency: priceCurrency ||"INR"
        },
        images,
        seller: seller._id
    })
    
    res.status(200).json({
        message: 'product created successfully',
        success: true,
        product
    })
}

export const getSellerProduct = async(req,res)=>{
    const seller = req.user

    const product = await productModel.find({seller: seller._id})

    res.status(200).json({
        message: 'product fetched successfully',
        success: true,
        product
    })
}

export const getAllProduct = async (req,res)=>{
    const product = await productModel.find()
    return res.status(200).json({
        message: "products fetched",
        product
    })
}

export const getProductDetails = async(req,res)=>{
    const {id} = req.params

    const product = await productModel.findById(id)

    if(!product){
        return res.status(401).json({
            message: "product not found",
            success: false
        })
    }
    
    return res.status(200).json({
        message: "product fetched successfully",
        success: true,
        product
    })
}

export const createProductVariant = async(req,res)=>{
    const {id} = req.params
    const parseField = (value) => {
        if(typeof value !== 'string'){
            return value
        }
        try{
            return JSON.parse(value)
        }catch{
            return undefined
        }
    }
    const attributes = parseField(req.body.attributes)
    const price = parseField(req.body.price)
    const {stock} = req.body

    if(!attributes || typeof attributes !== 'object' || Array.isArray(attributes)){
        return res.status(400).json({message: "variant attributes are required", success: false})
    }

    const cleanedAttributes = Object.fromEntries(
        Object.entries(attributes)
            .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
            .map(([key, value]) => [key.trim(), value.trim()])
            .filter(([key, value]) => key && value)
    )

    if(Object.keys(cleanedAttributes).length === 0){
        return res.status(400).json({message: "at least one variant attribute is required", success: false})
    }

    const currencies = ['USD', 'INR', 'GBP', 'EUR', 'JPY']
    if(
        !price ||
        price.amount === '' ||
        price.amount === null ||
        !Number.isFinite(Number(price.amount)) ||
        Number(price.amount) < 0 ||
        (price.currency && !currencies.includes(price.currency))
    ){
        return res.status(400).json({message: "a valid variant price is required", success: false})
    }

    const variantStock = Number(stock)
    if(stock === undefined || stock === null || stock === '' || !Number.isInteger(variantStock) || variantStock < 0){
        return res.status(400).json({message: "stock must be a non-negative whole number", success: false})
    }

    const product = await productModel.findOne({_id: id, seller: req.user._id})
    if(!product){
        return res.status(404).json({message: "product not found", success: false})
    }

    const images = await Promise.all((req.files || []).map(async(file)=>{
        const uploadedImage = await uploadFile({buffer: file.buffer, fileName: file.originalname})
        return {url: uploadedImage.url}
    }))

    product.variants.push({
        images,
        attributes: cleanedAttributes,
        price: {
            amount: Number(price.amount),
            currency: price.currency || product.price.currency
        },
        stock: variantStock
    })
    await product.save()

    return res.status(201).json({
        message: "product variant created successfully",
        success: true,
        product
    })
}

export const updateProductVariantStock = async(req,res)=>{
    const {id, variantId} = req.params
    const stockValue = req.body.stock
    const stock = Number(stockValue)

    if(stockValue === undefined || stockValue === null || stockValue === '' || !Number.isInteger(stock) || stock < 0){
        return res.status(400).json({message: "stock must be a non-negative whole number", success: false})
    }

    const product = await productModel.findOne({_id: id, seller: req.user._id})
    if(!product){
        return res.status(404).json({message: "product not found", success: false})
    }

    const variant = product.variants.id(variantId)
    if(!variant){
        return res.status(404).json({message: "product variant not found", success: false})
    }

    variant.stock = stock
    await product.save()

    return res.status(200).json({
        message: "variant stock updated successfully",
        success: true,
        product
    })
}
