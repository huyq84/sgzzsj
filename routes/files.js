const express = require('express');
const router = express.Router();

// 临时路由，返回空数据
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      files: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalFiles: 0
      }
    }
  });
});

module.exports = router;