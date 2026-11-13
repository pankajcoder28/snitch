import axios from "axios";

const productApiInstance = axios.create({
    baseURL: "http://localhost:3000/api/product",
    withCredentials: true
})

export const createProduct = async (formData)=>{
    const response = await productApiInstance.post('/',formData)
    return response.data
}

export const getSellerProduct = async ()=>{
    const response = await productApiInstance.get('/getproduct')

    return response.data
}

export const getAllProduct = async()=>{
    const response = await productApiInstance.get('/')
    return response.data
}

export const getProductById = async(productId)=>{
    const response = await productApiInstance.get(`/detail/${productId}`)
    return response.data
}

export const createProductVariant = async(productId, variant)=>{
    const formData = new FormData()
    formData.append("attributes", JSON.stringify(variant.attributes))
    formData.append("price", JSON.stringify(variant.price))
    formData.append("stock", variant.stock)
    const images = variant.images || []
    images.forEach((image)=> formData.append("images", image))
    const response = await productApiInstance.post(`/${productId}/variants`, formData)
    return response.data
}

export const updateProductVariantStock = async(productId, variantId, stock)=>{
    const response = await productApiInstance.patch(`/${productId}/variants/${variantId}/stock`, {stock})
    return response.data
}