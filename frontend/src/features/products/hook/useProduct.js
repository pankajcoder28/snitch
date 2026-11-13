import { useCallback } from "react";
import { useDispatch } from "react-redux";
import {createProduct,getAllProduct,getSellerProduct,getProductById,createProductVariant,updateProductVariantStock} from '../services/product.api.js'
import { setsellerProducts,setproducts } from "../state/product.slice.js";

export const useProduct = ()=>{
    const dispatch = useDispatch()

    async function handleCreateProduct(formData){
        const data = await createProduct(formData)
        return data.product
    }

    async function handleGetSellerProduct(){

        const data = await getSellerProduct();
        dispatch(setsellerProducts(data.product))
        return data.product
    }

    async function handleGetAllProducts(){
        const data = await getAllProduct();
        dispatch(setproducts(data.product))
        return data.product
    }

    const handleGetProductById = useCallback(async (productId)=>{
        const data = await getProductById(productId);
        return data.product
    }, [])

    async function handleCreateProductVariant(productId, variant){
        const data = await createProductVariant(productId, variant)
        return data.product
    }

    async function handleUpdateProductVariantStock(productId, variantId, stock){
        const data = await updateProductVariantStock(productId, variantId, stock)
        return data.product
    }

    return{ handleCreateProduct, handleGetSellerProduct , handleGetAllProducts , handleGetProductById, handleCreateProductVariant, handleUpdateProductVariantStock }
}
