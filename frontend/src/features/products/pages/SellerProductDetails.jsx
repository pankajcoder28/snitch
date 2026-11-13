import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "../hook/useProduct";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY"];
const MAX_VARIANT_IMAGES = 7;

const formatPrice = (amount, currency) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "INR"} ${amount}`;
  }
};

const SellerProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const {
    handleGetProductById,
    handleCreateProductVariant,
    handleUpdateProductVariantStock,
  } = useProduct();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [savingStockId, setSavingStockId] = useState("");
  const [stockDrafts, setStockDrafts] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [variantImages, setVariantImages] = useState([]);
  const variantImageUrls = useRef(new Set());
  const [variantForm, setVariantForm] = useState({
    attributes: { Size: "" },
    priceAmount: "",
    priceCurrency: "INR",
    stock: "0",
  });

  useEffect(
    () => () => {
      variantImageUrls.current.forEach((preview) =>
        URL.revokeObjectURL(preview),
      );
      variantImageUrls.current.clear();
    },
    [],
  );

  useEffect(() => {
    let active = true;

    const fetchProductDetails = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const data = await handleGetProductById(productId);
        if (active) {
          setProduct(data);
          setStockDrafts(
            Object.fromEntries(
              (data?.variants || []).map((variant) => [
                variant._id,
                variant.stock ?? 0,
              ]),
            ),
          );
          setVariantForm((current) => ({
            ...current,
            priceAmount: current.priceAmount || String(data?.price?.amount ?? ""),
            priceCurrency: data?.price?.currency || current.priceCurrency,
          }));
        }
      } catch (error) {
        if (active) {
          setErrorMsg(
            error?.response?.data?.message || "Unable to load this product.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchProductDetails();
    return () => {
      active = false;
    };
  }, [productId, handleGetProductById]);

  const updateProduct = (updatedProduct) => {
    setProduct(updatedProduct);
    setStockDrafts(
      Object.fromEntries(
        (updatedProduct?.variants || []).map((variant) => [
          variant._id,
          variant.stock ?? 0,
        ]),
      ),
    );
  };

  const handleAttributeChange = (attributeName, field, value) => {
    if (field === "name") {
      if (
        value !== attributeName &&
        Object.hasOwn(variantForm.attributes, value)
      ) {
        setErrorMsg("Variant attribute names must be unique.");
        return;
      }
      setVariantForm((current) => ({
        ...current,
        attributes: Object.fromEntries(
          Object.entries(current.attributes).map(([name, attributeValue]) => [
            name === attributeName ? value : name,
            attributeValue,
          ]),
        ),
      }));
      return;
    }

    setVariantForm((current) => ({
      ...current,
      attributes: { ...current.attributes, [attributeName]: value },
    }));
  };

  const addAttribute = () => {
    setVariantForm((current) => {
      let suffix = Object.keys(current.attributes).length + 1;
      let name = `Attribute ${suffix}`;
      while (Object.hasOwn(current.attributes, name)) {
        suffix += 1;
        name = `Attribute ${suffix}`;
      }
      return {
        ...current,
        attributes: { ...current.attributes, [name]: "" },
      };
    });
  };

  const removeAttribute = (attributeName) => {
    setVariantForm((current) => ({
      ...current,
      attributes: Object.fromEntries(
        Object.entries(current.attributes).filter(
          ([name]) => name !== attributeName,
        ),
      ),
    }));
  };

  const handleVariantImageChange = (event) => {
    const availableSlots = MAX_VARIANT_IMAGES - variantImages.length;
    const selectedImages = Array.from(event.target.files || [])
      .slice(0, availableSlots)
      .map((file) => {
        const preview = URL.createObjectURL(file);
        variantImageUrls.current.add(preview);
        return { file, preview };
      });
    if (selectedImages.length) {
      setVariantImages((current) => [...current, ...selectedImages]);
    }
    event.target.value = "";
  };

  const removeVariantImage = (index) => {
    const removedImage = variantImages[index];
    if (removedImage) {
      URL.revokeObjectURL(removedImage.preview);
      variantImageUrls.current.delete(removedImage.preview);
    }
    setVariantImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index),
    );
  };

  const handleCreateVariant = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const attributes = {};
    for (const [attributeName, attributeValue] of Object.entries(
      variantForm.attributes,
    )) {
      const name = attributeName.trim();
      const value = attributeValue.trim();
      if (!name || !value) {
        setErrorMsg("Add a name and value for each variant attribute.");
        return;
      }
      if (Object.hasOwn(attributes, name)) {
        setErrorMsg("Variant attribute names must be unique.");
        return;
      }
      attributes[name] = value;
    }

    const priceAmount = Number(variantForm.priceAmount);
    const stock = Number(variantForm.stock);
    if (!Number.isFinite(priceAmount) || priceAmount < 0) {
      setErrorMsg("Enter a valid variant price.");
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMsg("Initial stock must be a non-negative whole number.");
      return;
    }

    setIsCreating(true);
    try {
      const updatedProduct = await handleCreateProductVariant(productId, {
        attributes,
        price: { amount: priceAmount, currency: variantForm.priceCurrency },
        stock,
        images: variantImages.map(({ file }) => file),
      });
      updateProduct(updatedProduct);
      variantImages.forEach(({ preview }) => {
        URL.revokeObjectURL(preview);
        variantImageUrls.current.delete(preview);
      });
      setVariantImages([]);
      setVariantForm((current) => ({
        ...current,
        attributes: { Size: "" },
      }));
      setSuccessMsg("Variant created successfully.");
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message || "Unable to create the variant.",
      );
    } finally {
      setIsCreating(false);
    }
  };


  const handleSaveStock = async (variant) => {
    setErrorMsg("");
    setSuccessMsg("");
    const stock = Number(stockDrafts[variant._id]);
    if (!Number.isInteger(stock) || stock < 0) {
      setErrorMsg("Stock must be a non-negative whole number.");
      return;
    }

    setSavingStockId(variant._id);
    try {
      const updatedProduct = await handleUpdateProductVariantStock(
        productId,
        variant._id,
        stock,
      );
      updateProduct(updatedProduct);
      setSuccessMsg("Stock updated successfully.");
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message || "Unable to update variant stock.",
      );
    } finally {
      setSavingStockId("");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-[#E5E5E2] bg-[#F8F8F6] px-3.5 py-3 text-sm text-[#1A1A1A] outline-none transition focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F18]";
  const labelClass =
    "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]";
  const variants = product?.variants || [];

  return (
    <main className="min-h-screen bg-[#F8F8F6] px-4 py-8 text-[#1A1A1A] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/seller/dashboard")}
          className="mb-6 border-0 bg-transparent p-0 text-sm font-medium text-[#1E3A5F] hover:underline"
        >
          ← Back to products
        </button>

        {isLoading ? (
          <div className="rounded-2xl border border-[#EFEFED] bg-white p-8 text-sm text-[#8A8A8A]">
            Loading product details…
          </div>
        ) : !product ? (
          <div className="rounded-2xl border border-[#FECACA] bg-white p-8">
            <h1 className="text-xl font-bold">Product unavailable</h1>
            <p className="mt-2 text-sm text-[#8A8A8A]">
              {errorMsg || "This product could not be found."}
            </p>
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-6 rounded-2xl border border-[#EFEFED] bg-white p-5 shadow-sm sm:grid-cols-[180px_1fr] sm:p-7">
              <div className="aspect-square overflow-hidden rounded-xl bg-[#F5F5F3]">
                {product.images?.[0]?.url ? (
                  <img
                    src={product.images[0].url}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#ADADAD]">
                    No product image
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ADADAD]">
                  Seller studio / Product inventory
                </p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {product.title}
                </h1>
                {product.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#777]">
                    {product.description}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="rounded-lg bg-[#F5F5F3] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                      Base price
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#1E3A5F]">
                      {formatPrice(
                        product.price?.amount,
                        product.price?.currency,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F5F5F3] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                      Variants
                    </p>
                    <p className="mt-1 text-sm font-bold">{variants.length}</p>
                  </div>
                  <div className="rounded-lg bg-[#F5F5F3] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                      Total stock
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {variants.reduce(
                        (total, variant) => total + (Number(variant.stock) || 0),
                        0,
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {(errorMsg || successMsg) && (
              <div
                role="status"
                className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                  errorMsg
                    ? "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]"
                    : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E3A5F]"
                }`}
              >
                {errorMsg || successMsg}
              </div>
            )}

            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
              <section className="rounded-2xl border border-[#EFEFED] bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ADADAD]">
                      Inventory
                    </p>
                    <h2 className="mt-1 text-xl font-bold">Product variants</h2>
                  </div>
                  <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1E3A5F]">
                    {variants.length} {variants.length === 1 ? "variant" : "variants"}
                  </span>
                </div>

                {variants.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#DADAD5] bg-[#FAFAF8] px-5 py-12 text-center">
                    <p className="font-semibold">No variants yet</p>
                    <p className="mt-1 text-sm text-[#8A8A8A]">
                      Add sizes, colors, or other options to start managing inventory.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variants.map((variant) => {
                      const attributes = Object.entries(
                        variant.attributes || {},
                      );
                      return (
                        <article
                          key={variant._id}
                          className="rounded-xl border border-[#EFEFED] p-4 sm:p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap gap-2">
                                {attributes.length > 0 ? (
                                  attributes.map(([name, value]) => (
                                    <span
                                      key={name}
                                      className="rounded-md bg-[#F5F5F3] px-2.5 py-1 text-xs font-semibold"
                                    >
                                      <span className="text-[#8A8A8A]">
                                        {name}:{" "}
                                      </span>
                                      {value}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm font-semibold">
                                    Variant
                                  </span>
                                )}
                              </div>
                              <p className="mt-3 text-sm font-bold text-[#1E3A5F]">
                                {formatPrice(
                                  variant.price?.amount,
                                  variant.price?.currency,
                                )}
                              </p>
                            </div>
                            <div className="rounded-lg bg-[#F5F5F3] px-3 py-2 text-right">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                                Current stock
                              </p>
                              <p className="mt-0.5 text-lg font-bold">
                                {variant.stock ?? 0}
                              </p>
                            </div>
                          </div>
                          {variant.images?.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {variant.images.map((image, index) => (
                                <img
                                  key={`${image.url}-${index}`}
                                  src={image.url}
                                  alt={`Variant image ${index + 1}`}
                                  className="h-16 w-16 rounded-lg border border-[#EFEFED] object-cover"
                                />
                              ))}
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#F0F0ED] pt-4">
                            <label className="min-w-32 flex-1">
                              <span className={labelClass}>Update stock</span>
                              <input
                                aria-label={`Stock for ${attributes.map(([, value]) => value).join(" ") || "variant"}`}
                                className={inputClass}
                                type="number"
                                min="0"
                                step="1"
                                value={stockDrafts[variant._id] ?? ""}
                                onChange={(event) =>
                                  setStockDrafts((current) => ({
                                    ...current,
                                    [variant._id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                            <button
                              type="button"
                              disabled={savingStockId === variant._id}
                              onClick={() => handleSaveStock(variant)}
                              className="rounded-lg bg-[#1E3A5F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16305A] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingStockId === variant._id
                                ? "Saving…"
                                : "Save stock"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[#EFEFED] bg-white p-5 shadow-sm sm:p-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ADADAD]">
                  Add to catalogue
                </p>
                <h2 className="mt-1 text-xl font-bold">Create a variant</h2>
                <p className="mt-2 text-sm leading-5 text-[#8A8A8A]">
                  Define the option values, price, and starting inventory.
                </p>

                <form onSubmit={handleCreateVariant} className="mt-6 space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={labelClass}>Variant attributes</span>
                      <button
                        type="button"
                        onClick={addAttribute}
                        className="border-0 bg-transparent text-xs font-semibold text-[#1E3A5F] hover:underline"
                      >
                        + Add attribute
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {Object.entries(variantForm.attributes).map(
                        ([name, value], index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2"
                          >
                            <input
                              className={inputClass}
                              aria-label="Attribute name"
                              placeholder="e.g. Size"
                              value={name}
                              onChange={(event) =>
                                handleAttributeChange(
                                  name,
                                  "name",
                                  event.target.value,
                                )
                              }
                            />
                            <input
                              className={inputClass}
                              aria-label="Attribute value"
                              placeholder="e.g. Medium"
                              value={value}
                              onChange={(event) =>
                                handleAttributeChange(
                                  name,
                                  "value",
                                  event.target.value,
                                )
                              }
                            />
                            {Object.keys(variantForm.attributes).length > 1 && (
                              <button
                                type="button"
                                aria-label="Remove attribute"
                                onClick={() => removeAttribute(name)}
                                className="h-10 w-10 shrink-0 rounded-lg border border-[#EFEFED] bg-white text-lg text-[#8A8A8A] hover:bg-[#F5F5F3]"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_110px] gap-3">
                    <label>
                      <span className={labelClass}>Price</span>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={variantForm.priceAmount}
                        onChange={(event) =>
                          setVariantForm((current) => ({
                            ...current,
                            priceAmount: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Currency</span>
                      <select
                        className={inputClass}
                        value={variantForm.priceCurrency}
                        onChange={(event) =>
                          setVariantForm((current) => ({
                            ...current,
                            priceCurrency: event.target.value,
                          }))
                        }
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Initial stock</span>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={variantForm.stock}
                      onChange={(event) =>
                        setVariantForm((current) => ({
                          ...current,
                          stock: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="variant-images" className={labelClass}>
                        Variant images
                      </label>
                      <span className="text-xs text-[#8A8A8A]">
                        {variantImages.length}/{MAX_VARIANT_IMAGES}
                      </span>
                    </div>
                    <input
                      id="variant-images"
                      className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[#EFF6FF] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1E3A5F]`}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={
                        isCreating || variantImages.length >= MAX_VARIANT_IMAGES
                      }
                      onChange={handleVariantImageChange}
                    />
                    {variantImages.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {variantImages.map(({ preview }, index) => (
                          <div
                            key={preview}
                            className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[#EFEFED]"
                          >
                            <img
                              src={preview}
                              alt={`Selected variant image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              aria-label={`Remove variant image ${index + 1}`}
                              disabled={isCreating}
                              onClick={() => removeVariantImage(index)}
                              className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg text-white opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full rounded-lg bg-[#1E3A5F] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#16305A] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? "Creating…" : "Create variant"}
                  </button>
                </form>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default SellerProductDetails;
