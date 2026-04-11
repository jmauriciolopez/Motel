variable "domain_name" {
  description = "The target domain name for the frontend."
  type        = string
  default     = "moteles.criterioingenieria.online"
}

variable "s3_bucket_name" {
  description = "The name of the S3 bucket to create."
  type        = string
  default     = "moteles-frontend-prod"
}
