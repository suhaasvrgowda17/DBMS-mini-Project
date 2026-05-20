const Package = require('../models/Package');

// Get all packages or search by query
exports.getPackages = async (req, res) => {
  try {
    const { search } = req.query;
    let data;
    if (search) {
      data = await Package.search(search);
    } else {
      data = await Package.getAll();
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get Packages Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve packages.' });
  }
};

// Create a new package (Admin only)
exports.createPackage = async (req, res) => {
  try {
    const { name, destination, price, duration, description, image_url } = req.body;

    if (!name || !destination || !price || !duration) {
      return res.status(400).json({ success: false, message: 'Required fields: Name, Destination, Price, Duration.' });
    }

    const insertId = await Package.create(name, destination, price, duration, description, image_url);
    res.status(201).json({
      success: true,
      message: 'Tour Package added successfully!',
      packageId: insertId
    });
  } catch (error) {
    console.error('Create Package Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create tour package.' });
  }
};

// Update an existing package (Admin only)
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, destination, price, duration, description, image_url } = req.body;

    if (!name || !destination || !price || !duration) {
      return res.status(400).json({ success: false, message: 'Required fields: Name, Destination, Price, Duration.' });
    }

    const updated = await Package.update(id, name, destination, price, duration, description, image_url);
    if (updated) {
      res.json({ success: true, message: 'Tour Package details updated successfully!' });
    } else {
      res.status(404).json({ success: false, message: 'Tour package not found.' });
    }
  } catch (error) {
    console.error('Update Package Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update package details.' });
  }
};

// Delete a package (Admin only)
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Package.delete(id);
    if (deleted) {
      res.json({ success: true, message: 'Tour Package deleted successfully.' });
    } else {
      res.status(404).json({ success: false, message: 'Tour package not found.' });
    }
  } catch (error) {
    console.error('Delete Package Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete tour package.' });
  }
};
