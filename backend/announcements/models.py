from django.db import models

class Announcement(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True, null=True)
    priority = models.CharField(max_length=50, default='Normal')
    date = models.DateField(null=True, blank=True)
    author = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.author})"
