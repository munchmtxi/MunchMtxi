const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDYsInJvbGUiOjIsImlhdCI6MTc0MjY0ODExMCwiZXhwIjoxNzQzMjUyOTEwfQ.QjTwAcJCWorODkyc_bAusAE52VqP4MonWZJ176d_B94';
const secret = 'afe4137b5164670330edad6f789cc400fec0c8ff70631d2de2820b59bcc537a8'; // Replace with your actual JWT_SECRET

jwt.verify(token, secret, (err, decoded) => {
  if (err) {
    console.error('Verification failed:', err.message);
  } else {
    console.log('Token decoded:', decoded);
  }
});