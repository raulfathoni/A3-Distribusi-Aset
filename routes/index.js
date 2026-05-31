var express = require("express");
var router = express.Router();
const indexController = require("../controllers/indexController");
const { isAuthenticated } = require("../middlewares/auth");

/* GET home page. */
router.get("/", (req, res) => {
  if (req.session.userId) {
    return res.redirect("/assets");
  }
  res.redirect("/login");
});

router.get("/home", isAuthenticated, indexController.home);

router.get("/login", indexController.loginPage);

router.post("/login", indexController.login);

router.get("/logout", indexController.logout);

module.exports = router;