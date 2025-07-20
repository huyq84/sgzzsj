const express = require('express');
const router = express.Router();

// 临时路由，返回空数据
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      organizations: []
    }
  });
});

module.exports = router;