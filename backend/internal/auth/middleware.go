package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const ContextUserID = "userID"

// Middleware validates the Bearer token and stores the user id in the gin context.
func Middleware(tm *TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		claims, err := tm.ParseAccessToken(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}
		c.Set(ContextUserID, claims.Subject)
		c.Next()
	}
}

// UserID returns the authenticated user id from the context.
func UserID(c *gin.Context) string {
	return c.GetString(ContextUserID)
}
