import {
  AzureKeyCredential,
  SearchClient,
  SearchIndex,
  SearchIndexClient
} from '@azure/search-documents';
import { DefaultAzureCredential } from '@azure/identity';
import { retry } from '../utils/retryUtils';

/**
 * Service for managing search index configuration
 */
export class SearchIndexManager {
  private readonly searchIndexClient: SearchIndexClient;
  private readonly serviceEndpoint: string;
  private readonly indexName: string;
  
  /**
   * Creates a new instance of SearchIndexManager
   * @param serviceEndpoint Azure Cognitive Search service endpoint
   * @param indexName Name of the search index
   * @param apiKey Optional API key (if not using managed identity)
   */
  constructor(
    serviceEndpoint: string,
    indexName: string,
    private readonly apiKey?: string
  ) {
    this.serviceEndpoint = serviceEndpoint;
    this.indexName = indexName;
    
    // Initialize search client with appropriate credentials
    if (apiKey) {
      this.searchIndexClient = new SearchIndexClient(
        serviceEndpoint,
        new AzureKeyCredential(apiKey)
      );
    } else {
      // Use managed identity (preferred in production)
      this.searchIndexClient = new SearchIndexClient(
        serviceEndpoint,
        new DefaultAzureCredential()
      );
    }
  }
  
  /**
   * Creates the search index if it doesn't already exist
   * @returns True if index was created, false if it already existed
   */
  public async createIndexIfNotExists(): Promise<boolean> {
    try {
      // Check if the index exists
      const indexExists = await this.indexExists();
      
      if (!indexExists) {
        console.log(`Creating search index: ${this.indexName}`);
        const index = this.getIndexDefinition();
        
        await retry(() => this.searchIndexClient.createIndex(index), 3, 1000);
        return true;
      }
      
      console.log(`Search index ${this.indexName} already exists`);
      return false;
    } catch (error) {
      console.error(`Error creating search index ${this.indexName}:`, error);
      throw error;
    }
  }
  
  /**
   * Updates an existing search index with new fields or settings
   * @returns True if index was updated successfully
   */
  public async updateIndex(): Promise<boolean> {
    try {
      console.log(`Updating search index: ${this.indexName}`);
      const index = this.getIndexDefinition();
      
      await retry(() => this.searchIndexClient.createOrUpdateIndex(index), 3, 1000);
      return true;
    } catch (error) {
      console.error(`Error updating search index ${this.indexName}:`, error);
      throw error;
    }
  }
  
  /**
   * Deletes the search index if it exists
   * @returns True if index was deleted, false if it didn't exist
   */
  public async deleteIndexIfExists(): Promise<boolean> {
    try {
      const indexExists = await this.indexExists();
      
      if (indexExists) {
        console.log(`Deleting search index: ${this.indexName}`);
        await retry(() => this.searchIndexClient.deleteIndex(this.indexName), 3, 1000);
        return true;
      }
      
      console.log(`Search index ${this.indexName} does not exist`);
      return false;
    } catch (error) {
      console.error(`Error deleting search index ${this.indexName}:`, error);
      throw error;
    }
  }
  
  /**
   * Creates a search client for the index
   * @returns SearchClient instance
   */
  public createSearchClient(): SearchClient<any> {
    if (this.apiKey) {
      return new SearchClient(
        this.serviceEndpoint,
        this.indexName,
        new AzureKeyCredential(this.apiKey)
      );
    } else {
      return new SearchClient(
        this.serviceEndpoint,
        this.indexName,
        new DefaultAzureCredential()
      );
    }
  }
  
  /**
   * Checks if the index exists
   * @returns True if the index exists, false otherwise
   */
  private async indexExists(): Promise<boolean> {
    try {
      const indexesIterator = this.searchIndexClient.listIndexes();
      const indices: SearchIndex[] = [];
      for await (const index of indexesIterator) {
        indices.push(index);
      }
      const indexNames = indices.map(index => index.name);
      return indexNames.includes(this.indexName);
    } catch (error) {
      console.error(`Error checking if index ${this.indexName} exists:`, error);
      throw error;
    }
  }
  
  /**
   * Gets the search index definition with all fields and configurations
   * @returns SearchIndex definition
   */
  private getIndexDefinition(): SearchIndex {
    // Define the index schema with fields for DocumentChunk
    return {
      name: this.indexName,
      fields: [
        {
          name: "id",
          type: "Edm.String",
          key: true,
          searchable: false,
          filterable: true,
          sortable: false,
          facetable: false
        },
        {
          name: "documentId",
          type: "Edm.String",
          searchable: false,
          filterable: true,
          sortable: false,
          facetable: true
        },
        {
          name: "filename",
          type: "Edm.String",
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: "content",
          type: "Edm.String",
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false,
          analyzerName: "standard.lucene"
        },
        {
          name: "embedding",
          type: "Collection(Edm.Single)",
          searchable: true,
          filterable: false,
          sortable: false,
          facetable: false,
          vectorSearchDimensions: 1536,  // For text-embedding-ada-002
          vectorSearchProfileName: "myHnswProfile"
        },
        {
          name: "chunkIndex",
          type: "Edm.Int32",
          searchable: false,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: "contentType",
          type: "Edm.String",
          searchable: false,
          filterable: true,
          sortable: false,
          facetable: true
        },
        {
          name: "title",
          type: "Edm.String",
          searchable: true,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: "sectionTitle",
          type: "Edm.String",
          searchable: true,
          filterable: true,
          sortable: false,
          facetable: true
        },
        {
          name: "pageNumber",
          type: "Edm.Int32",
          searchable: false,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: "sectionHierarchy",
          type: "Collection(Edm.String)",
          searchable: true,
          filterable: true,
          sortable: false,
          facetable: true
        },
        {
          name: "tags",
          type: "Collection(Edm.String)",
          searchable: true,
          filterable: true,
          sortable: false,
          facetable: true
        },
        {
          name: "classification",
          type: "Edm.String",
          searchable: false,
          filterable: true,
          sortable: false,
          facetable: true
        },
        {
          name: "contentHash",
          type: "Edm.String",
          searchable: false,
          filterable: true,
          sortable: false,
          facetable: false
        },
        {
          name: "createdAt",
          type: "Edm.DateTimeOffset",
          searchable: false,
          filterable: true,
          sortable: true,
          facetable: false
        },
        {
          name: "updatedAt",
          type: "Edm.DateTimeOffset",
          searchable: false,
          filterable: true,
          sortable: true,
          facetable: false
        }
      ],
      // Vector search configuration for semantic embeddings
      vectorSearch: {
        algorithms: [
          {
            name: "myHnsw",
            kind: "hnsw",
            parameters: {
              m: 4, // Number of established connections
              efConstruction: 400, // Size of the dynamic candidate list for constructing the graph
              efSearch: 500, // Size of the dynamic candidate list for searching the graph
              metric: "cosine"
            }
          }
        ],
        profiles: [
          {
            name: "myHnswProfile",
            algorithmConfigurationName: "myHnsw"
          }
        ]
      },
      // Semantic configuration removed due to API compatibility issues
      
    };
  }
}
