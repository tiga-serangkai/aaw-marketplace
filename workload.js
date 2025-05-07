import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Configuration
export const options = {
  scenarios: {
    regular_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 150 },
        { duration: '3m', target: 300 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 50 },
      ],
      gracefulRampDown: '30s',
    },
    special_order_user: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10m',
    }
  },
  setupTimeout: '120s', 
  thresholds: {
    http_req_duration: ['p(95)<1500'],    
    'http_req_duration{name:register}': ['p(95)<3500'],                  
    'http_req_duration{name:login}': ['p(95)<1500'],
    'http_req_duration{name:getProducts}': ['p(95)<3500'],
    'http_req_duration{name:addToCart}': ['p(95)<1500'],
    'http_req_duration{name:getCart}': ['p(95)<1200'],
    'http_req_duration{name:getSingleProduct}': ['p(95)<3500'],
    'http_req_duration{name:getOrders}': ['p(95)<2000'],
    'http_req_duration{name:getOrderById}': ['p(95)<1500'],
    'http_req_duration{name:cancelOrder}': ['p(95)<2000'],
    'http_req_duration{name:placeOrder}': ['p(95)<2500'],
    'http_req_duration{name:payOrder}': ['p(95)<2500'],
  },
};

// Base URLs
const AUTH_SERVICE_URL = 'http://localhost:8000/api/auth';
const PRODUCT_SERVICE_URL = 'http://localhost:8002/api/product';
const CART_SERVICE_URL = 'http://localhost:8001/api/cart';
const ORDER_SERVICE_URL = 'http://localhost:8001/api/order'; 

const specialOrderUser = {
  username: "nangis",
  password: "RXKing>supersonic420",
  id: "de8d2088-3152-401f-861d-6f2b301b87ca"
};

// Setup function to pre-register users before the test
export function setup() {
  console.log('Starting user registration...');
  const registeredUsers = [];
  
  // Generate user data
  const users = [];
  for (let i = 1; i <= 300; i++) {
    users.push({
      username: `testuser${i}_${uuidv4().substring(0, 8)}`,
      email: `testuser${i}_${uuidv4().substring(0, 8)}@example.com`,
      password: `Password${i}!${uuidv4().substring(0, 8)}`,
      full_name: `Test User ${i}`,
      address: `${i} Test Street, Test City`,
      phone_number: `08${randomIntBetween(10000000, 99999999)}`
    });
  }

  // Register all users
  for (const user of users) {
    const registerPayload = JSON.stringify({
      username: user.username,
      email: user.email,
      password: user.password,
      full_name: user.full_name,
      address: user.address,
      phone_number: user.phone_number
    });

    const registerResponse = http.post(`${AUTH_SERVICE_URL}/register`, registerPayload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (registerResponse.status === 200 || registerResponse.status === 201) {
      try {
        const registerData = JSON.parse(registerResponse.body);
        if (Array.isArray(registerData) && registerData.length > 0) {
          user.id = registerData[0].id;
          registeredUsers.push(user);
        }
      } catch (e) {
        console.log('Error parsing registration response:', e);
      }
    } else {
      console.log(`Registration failed for user ${user.username}: ${registerResponse.status} ${registerResponse.body}`);
    }
    
  }

  console.log(`Completed registration of ${registeredUsers.length} users`);
  return { registeredUsers };
}

// Store product IDs from responses for later use
let productIds = [];

// Regular user flow - modified to use pre-registered users
function regularUserFlow(data) {
  const userData = data.registeredUsers[__VU % data.registeredUsers.length];
  let token = '';
  let userId = userData.id;

  group('User Authentication', function() {
    // Login with pre-registered user
    const loginPayload = JSON.stringify({
      username: userData.username,
      password: userData.password
    });

    const loginResponse = http.post(`${AUTH_SERVICE_URL}/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' }
    });

    check(loginResponse, {
      'login successful': (r) => r.status === 200,
    });

    if (loginResponse.status === 200) {
      try {
        const loginData = JSON.parse(loginResponse.body);
        token = loginData.token;
      } catch (e) {
        console.log('Error parsing login response:', e);
      }
    }

    sleep(randomIntBetween(0.5, 1.5));
  });

  // Only proceed if we have a valid token
  if (token) {
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

     group('Browse Products', function() {
      // 3. Get all products
      const productsResponse = http.get(`${PRODUCT_SERVICE_URL}/`, {
        headers: authHeaders,
        tags: { name: 'getProducts' }
      });

      check(productsResponse, {
        'get products successful': (r) => r.status === 200,
      });

      if (productsResponse.status === 200) {
        try {
          const productsData = JSON.parse(productsResponse.body);
          if (productsData.products && Array.isArray(productsData.products)) {
            productIds = productsData.products.map(product => product.id);
          }
        } catch (e) {
          console.log('Error parsing products response:', e);
        }
      }

      sleep(randomIntBetween(0.5, 2)); // Reduced sleep times for higher load

      // 4. Add product to cart - add multiple products to increase load
      for (let i = 0; i < 3; i++) { // Add multiple products to cart
        if (productIds.length > 0) {
          const randomProductIndex = Math.floor(Math.random() * productIds.length);
          const productId = productIds[randomProductIndex];
          const quantity = randomIntBetween(1, 5);

          const addToCartPayload = JSON.stringify({
            user: { id: userId },
            product_id: productId,
            quantity: quantity
          });

          const addToCartResponse = http.post(`${CART_SERVICE_URL}`, addToCartPayload, {
            headers: authHeaders,
            tags: { name: 'addToCart' }
          });

          check(addToCartResponse, {
            'add to cart successful': (r) => r.status === 200 || r.status === 201,
          });

          sleep(randomIntBetween(0.3, 1)); // Shorter sleep between cart additions
        }
      }

      group('View User Cart', function() {
        // 5. View cart
        const cartPayload = JSON.stringify({
            user: { id: userId }
        });
        const cartResponse = http.get(`${CART_SERVICE_URL}`, {
            headers: authHeaders,
            body: cartPayload,
            tags: { name: 'getCart' }
        });
        check(cartResponse, {
            'get cart successful': (r) => r.status === 200,
        });

        sleep(randomIntBetween(2, 4));
      });

      group('Browse More Products', function() {
        // 6. Get all products again
        http.get(`${PRODUCT_SERVICE_URL}/`, {
          headers: authHeaders, 
          tags: { name: 'getProducts' }
        });

        sleep(randomIntBetween(2, 4));
      });

      // View product details
      // Add more repetitive product viewing to simulate real user browsing
      group('View Product Details', function() {
        // Store three random product IDs for view product detail flow
        const productId1 = productIds[Math.floor(Math.random() * productIds.length)];
        const productId2 = productIds[Math.floor(Math.random() * productIds.length)];
        const productId3 = productIds[Math.floor(Math.random() * productIds.length)];
        
        // View product details with pattern: View products more intensively
        for (let i = 0; i < 4; i++) {
          http.get(`${PRODUCT_SERVICE_URL}/${productId1}`, {
            headers: authHeaders,
            tags: { name: 'getSingleProduct' }
          });
          sleep(randomIntBetween(0.2, 0.8));
          
          http.get(`${PRODUCT_SERVICE_URL}/${productId2}`, {
            headers: authHeaders,
            tags: { name: 'getSingleProduct' }
          });
          sleep(randomIntBetween(0.2, 0.8));
          
          // Add a third product to increase variety
          http.get(`${PRODUCT_SERVICE_URL}/${productId3}`, {
            headers: authHeaders,
            tags: { name: 'getSingleProduct' }
          });
          sleep(randomIntBetween(0.2, 0.8));
        }
        
        // Add one more batch of product viewing with different pattern
        for (let i = 0; i < 3; i++) {
          // Get a random product (could be any of the previous or new)
          const randomProductId = productIds[Math.floor(Math.random() * productIds.length)];
          http.get(`${PRODUCT_SERVICE_URL}/${randomProductId}`, {
            headers: authHeaders,
            tags: { name: 'getSingleProduct' }
          });
          sleep(randomIntBetween(0.2, 0.8));
        }
      });
    });
 }
}

// Special order user flow
function specialOrderUserFlow() {
  let token = '';
  const userId = specialOrderUser.id;
  let orderIds = [];

  group('Special User Authentication', function() {
    // Login with special user
    const loginPayload = JSON.stringify({
      username: specialOrderUser.username,
      password: specialOrderUser.password
    });

    const loginResponse = http.post(`${AUTH_SERVICE_URL}/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' }
    });

    check(loginResponse, {
      'special user login successful': (r) => r.status === 200,
    });

    if (loginResponse.status === 200) {
      try {
        const loginData = JSON.parse(loginResponse.body);
        token = loginData.token;
      } catch (e) {
        console.log('Error parsing login response:', e);
      }
    }

    sleep(randomIntBetween(1, 2)); // Reduced sleep time for more intensive testing
  });

  // Only proceed if we have a valid token
  if (token) {
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    group('Order Management', function() {
      // View all orders
      for (let i = 0; i < 2; i++) {
        const orderPayload = JSON.stringify({
          user: { id: userId }
        });
        
        const ordersResponse = http.get(`${ORDER_SERVICE_URL}`, {
          headers: authHeaders,
          body: orderPayload,
          tags: { name: 'getOrders' }
        });
        
        check(ordersResponse, {
          'get orders successful': (r) => r.status === 200,
        });
        
        if (ordersResponse.status === 200) {
            try {
              const ordersData = JSON.parse(ordersResponse.body);
              if (ordersData.orders && Array.isArray(ordersData.orders) && ordersData.orders.length > 0) {
                // Save both order.id and order.user_id
                orderIds = ordersData.orders.map(order => ({
                  id: order.id,
                  user_id: order.user_id
                }));
              }
            } catch (e) {
              console.log('Error parsing orders response:', e);
            }
          }
        
        sleep(randomIntBetween(1, 3));
      }

    // View order details

      if (orderIds.length >= 2) {
        // Filter orders to ensure they belong to the same user_id
        const userOrders = orderIds.filter(order => order.user_id === userId);
      
        if (userOrders.length >= 2) {
          const orderId1 = userOrders[0].id;
          const orderId2 = userOrders[1].id;
      
          // View order details
          const orderDetailPayload = JSON.stringify({
            user: { id: userId }
          });

          http.get(`${ORDER_SERVICE_URL}/${orderId2}`, {
            headers: authHeaders,
            body: orderDetailPayload,
            tags: { name: 'getOrderById' }
          });
          sleep(randomIntBetween(1, 2));
      
          http.get(`${ORDER_SERVICE_URL}/${orderId1}`, {
            headers: authHeaders,
            body: orderDetailPayload,
            tags: { name: 'getOrderById' }
          });
          sleep(randomIntBetween(1, 2));
      
          http.get(`${ORDER_SERVICE_URL}/${orderId2}`, {
            headers: authHeaders,
            body: orderDetailPayload,
            tags: { name: 'getOrderById' }
          });
          sleep(randomIntBetween(0.5, 1)); 
        } else {
          console.log('Not enough orders for the current user to toggle between.');
        }
      }
      
      // View all orders again
      const orderPayload = JSON.stringify({
        user: { id: userId }
      });
      
      http.get(`${ORDER_SERVICE_URL}`, {
        headers: authHeaders,
        body: orderPayload,
        tags: { name: 'getOrders' }
      });
      sleep(randomIntBetween(0.5, 1)); // Reduced sleep time
      
      // Get a specific order detail
      if (orderIds.length > 0) {
        const orderToView = orderIds[Math.floor(Math.random() * orderIds.length)];
        const orderDetailPayload = JSON.stringify({
          user: { id: userId }
        });
        
        http.get(`${ORDER_SERVICE_URL}/${orderToView}`, {
          headers: authHeaders,
          body: orderDetailPayload,
          tags: { name: 'getOrderById' }
        });
        sleep(randomIntBetween(1, 2));
        
        // Cancel the order
        const cancelPayload = JSON.stringify({
          user: { id: userId }
        });
        
        const cancelResponse = http.put(`${ORDER_SERVICE_URL}/${orderToView}/cancel`, cancelPayload, {
          headers: authHeaders,
          tags: { name: 'cancelOrder' }
        });
        
        check(cancelResponse, {
          'cancel order successful': (r) => r.status === 200,
        });
        
        sleep(randomIntBetween(1, 3));
      }
      
      // Get all orders after cancellation
      http.get(`${ORDER_SERVICE_URL}`, {
        headers: authHeaders,
        body: orderPayload,
        tags: { name: 'getOrders' }
      });
      sleep(randomIntBetween(1, 3));
      
      // Place a new order
      const placeOrderPayload = JSON.stringify({
        user: { id: userId },
        shipping_provider: "TIKI" 
      });
      
      const placeOrderResponse = http.post(`${ORDER_SERVICE_URL}`, placeOrderPayload, {
        headers: authHeaders,
        tags: { name: 'placeOrder' }
      });
      
      check(placeOrderResponse, {
        'place order successful': (r) => r.status === 200 || r.status === 201,
      });
      
      let newOrderId = null;
      if (placeOrderResponse.status === 200 || placeOrderResponse.status === 201) {
        try {
          const orderData = JSON.parse(placeOrderResponse.body);
          if (orderData.id) {
            newOrderId = orderData.id;
            orderIds.push(newOrderId);
          }
        } catch (e) {
          console.log('Error parsing place order response:', e);
        }
      }
      
      sleep(randomIntBetween(2, 4));
      
      // Browse products
      http.get(`${PRODUCT_SERVICE_URL}/`, {
        headers: authHeaders,
        tags: { name: 'getProducts' }
      });
      sleep(randomIntBetween(1, 3));


            
      // Get a specific order detail
      if (orderIds.length > 0) {
        const orderToPay = orderIds[Math.floor(Math.random() * orderIds.length)];
        const orderDetailPayload = JSON.stringify({
          user: { id: userId }
        });
        
        const orderDetailResponse = http.get(`${ORDER_SERVICE_URL}/${orderToPay}`, {
          headers: authHeaders,
          body: orderDetailPayload,
          tags: { name: 'getOrderById' }
        });
        sleep(randomIntBetween(1, 2));

        let amount = 0;
        
        if (orderDetailResponse.status === 200) {
          try {
            const orderDetail = JSON.parse(orderDetailResponse.body);
      
            // Calculate amount based on quantity and unit_price
            if (orderDetail.items && Array.isArray(orderDetail.items)) {
              amount = orderDetail.items.reduce((total, item) => {
                return total + item.quantity * item.unit_price;
              }, 0);
            }
          } catch (e) {
            console.log('Error parsing order detail response:', e);
          }
        }
        
        // Pay the order
        const paymentPayload = JSON.stringify({
            payment_method: "debit",
            payment_reference: "a32bcdft55u",
            amount: amount
        });
        
        const paymentResponse = http.put(`${ORDER_SERVICE_URL}/${orderToPay}/pay`, paymentPayload, {
          headers: authHeaders,
          tags: { name: 'payOrder' }
        });
        
        check(paymentResponse, {
          'pay order successful': (r) => r.status === 200,
        });
        
        sleep(randomIntBetween(2, 4));
      }
      
      // Browse products again
      http.get(`${PRODUCT_SERVICE_URL}/`, {
        headers: authHeaders,
        tags: { name: 'getProducts' }
      });
      sleep(randomIntBetween(1, 3));
      
      // View order after payment
      if (newOrderId) {
        const orderDetailPayload = JSON.stringify({
          user: { id: userId }
        });
        
        http.get(`${ORDER_SERVICE_URL}/${newOrderId}`, {
          headers: authHeaders,
          body: orderDetailPayload,
          tags: { name: 'getOrderById' }
        });
        sleep(randomIntBetween(1, 2));
        
        // Try to cancel the paid order
        const cancelPayload = JSON.stringify({
          user: { id: userId }
        });
        
        const cancelPaidOrderResponse = http.put(`${ORDER_SERVICE_URL}/${newOrderId}/cancel`, cancelPayload, {
          headers: authHeaders,
          tags: { name: 'cancelOrder' }
        });
        
        check(cancelPaidOrderResponse, {
          'cancel paid order attempt': (r) => r.status === 200 
        });
      }
    });
  }
}

// Main function that K6 executes
export default function(data) {
    // Run both scenarios concurrently
    group('Regular User Flow', function() {
      regularUserFlow(data);
    });
  
    group('Special Order User Flow', function() {
      specialOrderUserFlow();
    });
  }