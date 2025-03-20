import os
import logging
import boto3
import aioboto3
from botocore.exceptions import ClientError
from typing import BinaryIO, Union, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class S3StorageService:
    """Service for handling document storage using Amazon S3."""
    
    def __init__(self):
        """Initialize the S3 storage service."""
        self.aws_access_key_id = settings.AWS_ACCESS_KEY_ID
        self.aws_secret_access_key = settings.AWS_SECRET_ACCESS_KEY
        self.region_name = settings.AWS_REGION
        self.bucket_name = settings.S3_BUCKET_NAME
        self.prefix = settings.S3_PREFIX
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.region_name
        )
        
        # Create S3 session for async operations
        self.s3_session = aioboto3.Session(
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key,
            region_name=self.region_name
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the S3 bucket exists, creating it if it doesn't."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"S3 bucket {self.bucket_name} exists")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404':
                logger.info(f"Creating S3 bucket {self.bucket_name}")
                try:
                    if self.region_name == 'us-east-1':
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        location = {'LocationConstraint': self.region_name}
                        self.s3_client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration=location
                        )
                    logger.info(f"S3 bucket {self.bucket_name} created")
                except ClientError as create_error:
                    logger.error(f"Error creating S3 bucket: {str(create_error)}")
                    raise
            else:
                logger.error(f"Error checking S3 bucket: {str(e)}")
                raise
    
    def get_s3_key(self, filename: str) -> str:
        """
        Generate an S3 key for a file.
        
        Args:
            filename: The filename
            
        Returns:
            S3 key
        """
        return f"{self.prefix}{filename}"
    
    def upload_file(self, file_path: str, s3_key: Optional[str] = None) -> str:
        """
        Upload a file to S3.
        
        Args:
            file_path: Path to the local file
            s3_key: Optional S3 key, if not provided will use filename
            
        Returns:
            S3 key of the uploaded file
        """
        if not s3_key:
            s3_key = self.get_s3_key(os.path.basename(file_path))
        
        try:
            self.s3_client.upload_file(
                Filename=file_path,
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Uploaded file {file_path} to S3 as {s3_key}")
            return s3_key
        except ClientError as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            raise
    
    def upload_fileobj(self, fileobj: BinaryIO, s3_key: str) -> str:
        """
        Upload a file-like object to S3.
        
        Args:
            fileobj: File-like object to upload
            s3_key: S3 key for the file
            
        Returns:
            S3 key of the uploaded file
        """
        try:
            self.s3_client.upload_fileobj(
                Fileobj=fileobj,
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Uploaded file object to S3 as {s3_key}")
            return s3_key
        except ClientError as e:
            logger.error(f"Error uploading file object to S3: {str(e)}")
            raise
    
    def download_file(self, s3_key: str, file_path: str) -> str:
        """
        Download a file from S3.
        
        Args:
            s3_key: S3 key of the file
            file_path: Local path to save the file
            
        Returns:
            Local file path
        """
        try:
            self.s3_client.download_file(
                Bucket=self.bucket_name,
                Key=s3_key,
                Filename=file_path
            )
            logger.info(f"Downloaded file from S3 {s3_key} to {file_path}")
            return file_path
        except ClientError as e:
            logger.error(f"Error downloading file from S3: {str(e)}")
            raise
    
    def get_file_content(self, s3_key: str) -> bytes:
        """
        Get the content of a file from S3.
        
        Args:
            s3_key: S3 key of the file
            
        Returns:
            File content as bytes
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"Error getting file content from S3: {str(e)}")
            raise
    
    async def get_file_content_async(self, s3_key: str) -> bytes:
        """
        Get the content of a file from S3 asynchronously.
        
        Args:
            s3_key: S3 key of the file
            
        Returns:
            File content as bytes
        """
        try:
            async with self.s3_session.client('s3') as s3:
                response = await s3.get_object(
                    Bucket=self.bucket_name,
                    Key=s3_key
                )
                async with response['Body'] as stream:
                    content = await stream.read()
                    return content
        except ClientError as e:
            logger.error(f"Error getting file content from S3 asynchronously: {str(e)}")
            raise
    
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            s3_key: S3 key of the file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Deleted file from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting file from S3: {str(e)}")
            return False
    
    def file_exists(self, s3_key: str) -> bool:
        """
        Check if a file exists in S3.
        
        Args:
            s3_key: S3 key of the file
            
        Returns:
            True if the file exists, False otherwise
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404':
                return False
            else:
                logger.error(f"Error checking if file exists in S3: {str(e)}")
                raise