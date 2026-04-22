// 🔥 GLOBAL VALIDATION FUNCTIONS

export function setError(input, message, errorId){
  input.classList.add("input-error");
  document.getElementById(errorId).innerText = message;
}

export function clearError(input, errorId){
  input.classList.remove("input-error");
  document.getElementById(errorId).innerText = "";
}


// 🔹 CATEGORY VALIDATION
export function validateCategoryForm(formId, inputId, errorId){

  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);

  form.addEventListener("submit", function(e){

    const value = input.value.trim();
    let isValid = true;

    if(!value){
      setError(input, "Category name is required", errorId);
      isValid = false;
    }
    else if(value.length < 3){
      setError(input, "Minimum 3 characters required", errorId);
      isValid = false;
    }
    else{
      clearError(input, errorId);
    }

    if(!isValid){
      e.preventDefault();
    }

  });

  input.addEventListener("input", function(){

    const value = this.value.trim();

    if(!value){
      setError(this, "Category name is required", errorId);
    }
    else if(value.length < 3){
      setError(this, "Minimum 3 characters required", errorId);
    }
    else{
      clearError(this, errorId);
    }

  });

}


// 🔹 PRODUCT VALIDATION
export function validateProductForm(formId){

  const form = document.getElementById(formId);

  const nameInput = document.getElementById("productName");
  const descInput = document.getElementById("productDescription");
  const priceInput = document.getElementById("productPrice");
  const categoryInput = document.getElementById("productCategory");

  form.addEventListener("submit", function(e){

    let isValid = true;

    // 🔹 NAME
    const name = nameInput.value.trim();
    if(!name){
      setError(nameInput, "Product name is required", "nameError");
      isValid = false;
    } 
    else if(name.length < 3){
      setError(nameInput, "Minimum 3 characters required", "nameError");
      isValid = false;
    } 
    else {
      clearError(nameInput, "nameError");
    }

    // 🔹 DESCRIPTION
    const desc = descInput.value.trim();
    if(!desc){
      setError(descInput, "Description is required", "descError");
      isValid = false;
    } 
    else {
      clearError(descInput, "descError");
    }

    // 🔹 PRICE
    const price = parseFloat(priceInput.value);
    if(isNaN(price) || price <= 0){
      setError(priceInput, "Price must be greater than 0", "priceError");
      isValid = false;
    } 
    else {
      clearError(priceInput, "priceError");
    }

    // 🔹 CATEGORY
    const category = categoryInput.value;
    if(!category){
      setError(categoryInput, "Category is required", "categoryError");
      isValid = false;
    } else {
      clearError(categoryInput, "categoryError");
    }

    // 🔹 IMAGE VALIDATION
    const imageInputs = document.querySelectorAll(
  'input[name="images"]'
);

const existingImages = document.querySelectorAll(
  '.preview-img'
);

let hasImage = false;

imageInputs.forEach(input => {
  if (input.files.length > 0) {
    hasImage = true;
  }
});

if (!hasImage && existingImages.length === 0) {
  alert("At least one product image is required");
  return false;
}

    // 🔹 VARIANTS VALIDATION
    const variantsValid = validateVariants();

    if(!isValid || !variantsValid){
      e.preventDefault();
    }

  });

}


// 🔹 VARIANT VALIDATION (DYNAMIC)
export function validateVariants(){

  const variantContainer = document.getElementById("variantContainer");
  const rows = variantContainer.querySelectorAll(".variant-row");

  let isValid = true;

  rows.forEach((row) => {

    const stockInput = row.querySelector('input[name="stock[]"]');
    const priceInput = row.querySelector('input[name="variantPrice[]"]');
    const imageInput = row.querySelector('input[name="variantImages"]');

    const stockError = row.querySelector(".stock-error");
    const priceError = row.querySelector(".price-error");

    const stock = parseInt(stockInput.value);
    const price = parseFloat(priceInput.value);

    // 🔹 PRICE
    if(isNaN(price) || price <= 0){
      priceInput.classList.add("input-error");
      priceError.innerText = "Price must be > 0";
      isValid = false;
    } else {
      priceInput.classList.remove("input-error");
      priceError.innerText = "";
    }

    // 🔹 STOCK
    if(isNaN(stock) || stock < 0){
      stockInput.classList.add("input-error");
      stockError.innerText = "Stock cannot be negative";
      isValid = false;
    } else {
      stockInput.classList.remove("input-error");
      stockError.innerText = "";
    }

    // 🔹 VARIANT IMAGE
   // 🔹 VARIANT IMAGE
const imageBox = row.querySelector(".variant-image-box");
const existingPreview = row.querySelector(".variant-preview");

let imgError = imageBox.querySelector(".variant-img-error");

const hasNewImage =
  imageInput &&
  imageInput.files.length > 0;

const hasExistingImage =
  existingPreview &&
  existingPreview.src &&
  !existingPreview.src.includes("no-image");

if (!hasNewImage && !hasExistingImage) {

  if (!imgError) {
    imgError = document.createElement("small");
    imgError.className = "error-text variant-img-error";
    imageBox.appendChild(imgError);
  }

  imgError.innerText = "Image required";
  isValid = false;

} else {
  if (imgError) {
    imgError.innerText = "";
  }
}

  });

  return isValid;
}