const express = require('express');
const router = express.Router();

// 临时路由，返回空数据
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      templates: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalTemplates: 0
      }
    }
  });
});

module.exports = router;