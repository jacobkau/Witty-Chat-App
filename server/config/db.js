// server/config/db.js
const mongoose = require('mongoose');

const uri = 'mongodb+srv://okonyo02:m11A511CFoq5Wj9J@cluster0.rg2grfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri)
  .then(() => console.log('MongoDB Connected: Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

module.exports = mongoose; 