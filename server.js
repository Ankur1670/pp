const express = require('express');
const paypal = require('paypal-rest-sdk');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PayPal configuration
paypal.configure({
  mode: 'sandbox', // Change to 'live' for production
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Serve the HTML file
app.get('/', (req, res) => {
  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Checkout</title>
      <style>
          /* Your CSS styles here */
      </style>
  </head>
  <body>
      <div class="container">
          <h2>Checkout</h2>
          <div class="payment-options">
              <div class="payment-option selected" id="paypal-option">
                  <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_74x46.jpg" alt="PayPal">
              </div>
              <div class="payment-option" id="card-option">
                  <img src="https://via.placeholder.com/74x46?text=Card" alt="Credit/Debit Card">
              </div>
          </div>

          <div id="paypal-button-container"></div>

          <div id="card-form">
              <!-- Same form elements as before -->
          </div>
      </div>

      <script src="https://www.paypal.com/sdk/js?client-id=${process.env.PAYPAL_CLIENT_ID}"></script>
      <script>
          document.getElementById('paypal-option').addEventListener('click', function() {
              document.getElementById('card-form').style.display = 'none';
              document.getElementById('paypal-button-container').style.display = 'block';
              this.classList.add('selected');
              document.getElementById('card-option').classList.remove('selected');
          });

          document.getElementById('card-option').addEventListener('click', function() {
              document.getElementById('card-form').style.display = 'block';
              document.getElementById('paypal-button-container').style.display = 'none';
              this.classList.add('selected');
              document.getElementById('paypal-option').classList.remove('selected');
          });

          paypal.Buttons({
              createOrder: function(data, actions) {
                  return actions.order.create({
                      purchase_units: [{
                          amount: {
                              value: '10.00'
                          }
                      }]
                  });
              },
              onApprove: function(data, actions) {
                  return actions.order.capture().then(function(details) {
                      alert('Transaction completed by ' + details.payer.name.given_name);
                  });
              }
          }).render('#paypal-button-container');
      </script>
  </body>
  </html>
  `;
  res.send(htmlContent);
});

// Payment route
app.post('/pay', (req, res) => {
  const create_payment_json = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal'
    },
    redirect_urls: {
      return_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel'
    },
    transactions: [{
      item_list: {
        items: [{
          name: 'Sample Item',
          sku: '001',
          price: '10.00',
          currency: 'USD',
          quantity: 1
        }]
      },
      amount: {
        currency: 'USD',
        total: '10.00'
      },
      description: 'Payment description here.'
    }]
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
    if (error) {
      throw error;
    } else {
      for (let i = 0; i < payment.links.length; i++) {
        if (payment.links[i].rel === 'approval_url') {
          res.redirect(payment.links[i].href);
        }
      }
    }
  });
});

// Success route
app.get('/success', (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [{
      amount: {
        currency: 'USD',
        total: '10.00'
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      res.send('Payment success! Thank you for your purchase.');
    }
  });
});

// Cancel route
app.get('/cancel', (req, res) => res.send('Payment canceled.'));

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
