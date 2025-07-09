/**
 * Search Index Manager
 * Creates and manages the Azure AI Search index for document chunks
 */

import { 
  SearchIndexClient, 
  SearchField, 
  SearchFieldDataType,
  SearchIndex
} from "@azure/search-documents";
import { DefaultAzureCredential } from "@azure/identity";

export class SearchIndexManager {
  private searchServiceEndpoint: string;
  private searchIndexName: string;
  private indexClient: SearchIndexClient;
  
  constructor(searchServiceEndpoint: string, searchIndexName: string) {
    this.searchServiceEndpoint = searchServiceEndpoint;
    this.searchIndexName = searchIndexName;
    
    // Initialize AI Search client using Managed Identity
    const credential = new DefaultAzureCredential();
    this.indexClient = new SearchIndexClient(this.searchServiceEndpoint, credential);
  }
  
  /**
   * Create or update the search index
   */
  public async createOrUpdateIndex(): Promise<void> {
    try {
      console.log(`Creating or updating search index: ${this.searchIndexName}`);
      
      // Define the fields for the document chunks index
      const fields = this.getIndexFields();
      
      // Define the index schema
      const index: SearchIndex = {
        name: this.searchIndexName,
        fields,
        suggesters: [
          {
            name: "document-suggester",
            sourceFields: ["documentTitle", "content", "heading", "keywords"],
            searchMode: "analyzingInfixMatching"
          }
        ],
        vectorSearch: {
          algorithms: [
            {
              name: "default-hnsw-config",
              kind: "hnsw", // Hierarchical Navigable Small World graph algorithm
              parameters: {
                m: 4,               // Number of established connections (default: 4)
                efConstruction: 400, // Size of the dynamic candidate list for construction (default: 400)
                efSearch: 500,      // Size of the dynamic candidate list for search (default: 500)
                metric: "cosine"     // Distance metric (cosine similarity)
              }
            }
          ],
          profiles: [
            {
              name: "default-hnsw-config",
              algorithmConfigurationName: "default-hnsw-config"
            }
          ]
        }
      };
      
      // Create or update the index
      await this.indexClient.createOrUpdateIndex(index);
      
      console.log(`Successfully created/updated index: ${this.searchIndexName}`);
    } catch (error: any) {
      console.error(`Error creating search index: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete the index if it exists
   */
  public async deleteIndex(): Promise<void> {
    try {
      console.log(`Checking if index exists: ${this.searchIndexName}`);
      
      const exists = await this.indexExists();
      
      if (exists) {
        console.log(`Deleting index: ${this.searchIndexName}`);
        await this.indexClient.deleteIndex(this.searchIndexName);
        console.log(`Successfully deleted index: ${this.searchIndexName}`);
      } else {
        console.log(`Index doesn't exist: ${this.searchIndexName}`);
      }
    } catch (error: any) {
      console.error(`Error deleting search index: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Check if the index exists
   */
  public async indexExists(): Promise<boolean> {
    try {
      const indexes = await this.indexClient.listIndexes();
      
      for await (const index of indexes) {
        if (index.name === this.searchIndexName) {
          return true;
        }
      }
      
      return false;
    } catch (error: any) {
      console.error(`Error checking if index exists: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Define the fields for the document chunks index
   */
  private getIndexFields(): SearchField[] {
    return [
      {
        name: "id",
        type: "Edm.String",
        key: true,
        searchable: false,
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
        name: "documentId",
        type: "Edm.String",
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "documentTitle",
        type: "Edm.String",
        searchable: true,
        filterable: true,
        sortable: true,
        facetable: true
      },
      {
        name: "documentUrl",
        type: "Edm.String",
        searchable: false,
        filterable: false,
        sortable: false,
        facetable: false
      },
      {
        name: "courseId",
        type: "Edm.String",
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "courseTitle",
        type: "Edm.String",
        searchable: true,
        filterable: true,
        sortable: true,
        facetable: true
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
        name: "totalChunks",
        type: "Edm.Int32",
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: false
      },
      {
        name: "chunkType",
        type: "Edm.String",
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "heading",
        type: "Edm.String",
        searchable: true,
        filterable: true,
        sortable: true,
        facetable: true
      },
      {
        name: "precedingHeadings",
        type: "Collection(Edm.String)",
        searchable: true,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "sectionNumber",
        type: "Edm.String",
        searchable: true,
        filterable: true,
        sortable: true,
        facetable: true
      },
      {
        name: "hierarchyLevel",
        type: "Edm.Int32",
        searchable: false,
        filterable: true,
        sortable: true,
        facetable: true
      },
      {
        name: "keywords",
        type: "Collection(Edm.String)",
        searchable: true,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "references",
        type: "Collection(Edm.String)",
        searchable: true,
        filterable: true,
        sortable: false,
        facetable: false
      },
      {
        name: "fileType",
        type: "Edm.String",
        searchable: false,
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
        name: "publicationNumber",
        type: "Edm.String",
        searchable: true,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "revisionNumber",
        type: "Edm.String",
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "namedEntities",
        type: "Collection(Edm.String)",
        searchable: true,
        filterable: true,
        sortable: false,
        facetable: true
      },
      {
        name: "contentVector",
        type: "Collection(Edm.Single)",
        searchable: true,
        filterable: false,
        sortable: false,
        facetable: false,
        vectorSearchDimensions: 1536, // OpenAI ada-002 embedding dimensions
        vectorSearchProfileName: "default-hnsw-config"
      }
    ];
  }
}
