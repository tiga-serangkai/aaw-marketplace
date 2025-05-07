import requests
import random

# Base URLs
AUTH_SERVICE_URL = "http://localhost:8000/api/auth"
ORDER_SERVICE_URL = "http://localhost:8001/api/order"
CART_SERVICE_URL = "http://localhost:8001/api/cart"
PRODUCT_SERVICE_URL = "http://localhost:8002/api/product"

# User data
user = {
    "id": "de8d2088-3152-401f-861d-6f2b301b87ca",
    "username": "nangis",
    "email": "nanangismail@gmail.com",
    "full_name": "Nanang Ismail",
    "address": "Jakarta, Indonesia",
    "phone_number": "085544776615"
}

# Login to get the token
def login(username, password):
    payload = {
        "username": username,
        "password": password
    }
    response = requests.post(f"{AUTH_SERVICE_URL}/login", json=payload)
    if response.status_code == 200:
        return response.json().get("token")
    else:
        print("Login failed:", response.text)
        return None

# Get all products
def get_all_products():
    response = requests.get(PRODUCT_SERVICE_URL)
    if response.status_code == 200:
        return response.json().get("products", [])  # Access the "products" key in the response
    else:
        print("Failed to fetch products:", response.text)
        return []

# Add product to cart and place order
def add_to_cart_and_place_order(token, user_id, product_id):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Add to cart
    cart_payload = {
        "user": {"id": user_id},
        "product_id": product_id,
        "quantity": random.randint(1, 5)
    }
    cart_response = requests.post(CART_SERVICE_URL, json=cart_payload, headers=headers)
    if cart_response.status_code in [200, 201]:
        print(f"Product {product_id} added to cart successfully.")
    else:
        print(f"Failed to add product {product_id} to cart:", cart_response.text)
        return

    # Place order
    order_payload = {
        "user_id": user_id,
        "shipping_provider": "TIKI",
        "items": [
            {
                "product_id": product_id,
                "quantity": cart_payload["quantity"]
            }
        ]
    }
    order_response = requests.post(f"{ORDER_SERVICE_URL}", json=order_payload, headers=headers)
    if order_response.status_code in [200, 201]:
        print(f"Order placed successfully for product {product_id}.")
    else:
        print(f"Failed to place order for product {product_id}:", order_response.text)

# Add product to cart only
def add_to_cart(token, user_id, product_id):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "user": {"id": user_id},
        "product_id": product_id,
        "quantity": random.randint(1, 5)
    }
    response = requests.post(CART_SERVICE_URL, json=payload, headers=headers)
    if response.status_code in [200, 201]:
        print(f"Product {product_id} added to cart successfully.")
    else:
        print(f"Failed to add product {product_id} to cart:", response.text)

# Main script
if __name__ == "__main__":
    password = "RXKing>supersonic420"

    # Login to get the token
    token = login(user["username"], password)
    if token:
        print("Login successful. Token acquired.")

        # Get all products
        print("Fetching all products...")
        products = get_all_products()
        if not products:
            print("No products available. Exiting.")
            exit()

        # Ensure we have enough products
        if len(products) < 256 + 32:
            print(f"Not enough products available. Found {len(products)}, but need at least 288.")
            exit()

        # Add to cart and place order for 256 products
        print("Adding to cart and placing orders for 256 products...")
        for i in range(256):
            product_id = products[i]["id"]
            add_to_cart_and_place_order(token, user["id"], product_id)

        # Add to cart for 32 products
        print("Adding to cart for 32 products...")
        for i in range(256, 256 + 32):
            product_id = products[i]["id"]
            add_to_cart(token, user["id"], product_id)

        print("Dummy data creation completed.")
    else:
        print("Failed to acquire token. Exiting.")