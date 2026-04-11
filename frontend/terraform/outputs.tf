output "acm_validation_options" {
  description = "DNS validation records for the ACM certificate. Add these to your external DNS provider."
  value       = aws_acm_certificate.cert.domain_validation_options
}

output "cloudfront_domain_name" {
  description = "The domain name of the CloudFront distribution."
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "cloudfront_distribution_id" {
  description = "The ID of the CloudFront distribution."
  value       = aws_cloudfront_distribution.cdn.id
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket."
  value       = aws_s3_bucket.frontend.id
}
