// Re-export from product.config.ts to use S3 or local based on USE_S3 env
export { 
  brandConfig as brandMulterConfig,
  productConfig as productMediaMulterConfig 
} from './product.config';
