package server

import (
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func Listen(db *gorm.DB) {
	gin.SetMode(gin.ReleaseMode)

	router := gin.Default()
	router.SetTrustedProxies(nil)
	router.Static("/static", "web/static")
	router.StaticFile("/", "web/static/index.html")
	router.GET("/api/investment", func(c *gin.Context) {
		c.JSON(200, GetInvestment(db))
	})
	log.Info("Listening on 7500")
	router.Run(":7500")
}
