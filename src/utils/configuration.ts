// Configuration utility for SharePoint to Blob Storage sync
export interface AppConfiguration {
    sharepoint: {
        siteUrl: string;
        clientId: string;
        clientSecret: string;
        tenantId: string;
        libraryName: string;
    };
    blobStorage: {
        connectionString: string;
        containerName: string;
    };
    processing: {
        maxFiles: number;
        daysBack: number;
        batchSize: number;
        supportedFileTypes: string[];
    };
}

export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private config: AppConfiguration;

    private constructor() {
        this.config = this.loadConfiguration();
    }

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    public getConfig(): AppConfiguration {
        return this.config;
    }

    private loadConfiguration(): AppConfiguration {
        return {
            sharepoint: {
                siteUrl: process.env.SHAREPOINT_SITE_URL || '',
                clientId: process.env.SHAREPOINT_CLIENT_ID || '',
                clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || '',
                tenantId: process.env.SHAREPOINT_TENANT_ID || '',
                libraryName: process.env.SHAREPOINT_LIBRARY_NAME || 'Documents'
            },
            blobStorage: {
                connectionString: process.env.BLOB_STORAGE_CONNECTION_STRING || '',
                containerName: process.env.BLOB_CONTAINER_NAME || 'extracted-content'
            },
            processing: {
                maxFiles: parseInt(process.env.MAX_FILES_PER_RUN || '100'),
                daysBack: parseInt(process.env.DAYS_BACK_TO_SYNC || '30'),
                batchSize: parseInt(process.env.BATCH_SIZE || '5'),
                supportedFileTypes: ['pdf', 'docx', 'pptx']
            }
        };
    }

    public validateConfiguration(): string[] {
        const errors: string[] = [];

        if (!this.config.sharepoint.siteUrl) {
            errors.push('SHAREPOINT_SITE_URL is required');
        }
        if (!this.config.sharepoint.clientId) {
            errors.push('SHAREPOINT_CLIENT_ID is required');
        }
        if (!this.config.sharepoint.clientSecret) {
            errors.push('SHAREPOINT_CLIENT_SECRET is required');
        }
        if (!this.config.sharepoint.tenantId) {
            errors.push('SHAREPOINT_TENANT_ID is required');
        }
        if (!this.config.blobStorage.connectionString) {
            errors.push('BLOB_STORAGE_CONNECTION_STRING is required');
        }

        return errors;
    }
}
