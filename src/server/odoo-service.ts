import axios from "axios";
import { OdooParams, OdooResponse } from "../shared/types";

export class OdooService {
  async executeKw(params: OdooParams): Promise<OdooResponse> {
    try {
      const response = await axios.post(
        params.enderecoOdoo,
        {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              params.database,
              params.userId,
              params.password,
              params.model,
              params.method,
              [[]],
              { fields: params.fields }
            ]
          }
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      return {
        result: response.data.result
      };
    } catch (error: any) {
      console.error("Erro ao executar requisição Odoo:", error);
      
      // Formato de erro padronizado
      return {
        result: null,
        error: {
          code: error.response?.status || 500,
          message: error.message,
          data: error.response?.data
        }
      };
    }
  }
}