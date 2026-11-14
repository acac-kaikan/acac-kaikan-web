import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/app/layouts/AppLayout/AppLayout";
import AuthLayout from "@/app/layouts/AuthLayout/AuthLayout";
import RotaProtegida from "@/app/routes/RotaProtegida";
import PaginaPendente from "@/app/pages/PaginaPendente";
import PaginaNaoEncontrada from "@/app/pages/PaginaNaoEncontrada";
import {
  ConfirmacaoRecuperacaoPage,
  LoginPage,
  NovaSenhaPage,
  RecuperarSenhaPage,
  SenhaAlteradaPage,
} from "@/features/auth";
import { HomePage } from "@/features/home";
import { InventarioPage, LoteMovimentacoesPage } from "@/features/inventario";
import { DoacoesPage } from "@/features/doacoes";
import { AssociadosPage } from "@/features/associados";
import {
  EventoCardapioPage,
  EventoDetalhesPage,
  EventosPage,
} from "@/features/eventos";
import {
  EventoVendasPage,
  HistoricoVendasPage,
  RegistroVendasPage,
} from "@/features/vendas";
import { CaixaPage, FiadosGeraisPage, FiadosPage } from "@/features/caixa";
import { RelatorioGeralPage } from "@/features/relatorio";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
        <Route
          path="/confirmacao-recuperacao"
          element={<ConfirmacaoRecuperacaoPage />}
        />
        <Route path="/redefinicao-senha" element={<NovaSenhaPage />} />
        <Route path="/senha-alterada" element={<SenhaAlteradaPage />} />
      </Route>

      <Route element={<RotaProtegida />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/inicio" replace />} />
          <Route path="/inicio" element={<HomePage />} />
          <Route path="/associados" element={<AssociadosPage />} />
          <Route path="/estoque" element={<InventarioPage />} />
          <Route
            path="/estoque/:productId/lotes/:lotId/movimentacoes"
            element={<LoteMovimentacoesPage />}
          />
          <Route path="/doacoes" element={<DoacoesPage />} />
          <Route path="/eventos" element={<EventosPage />} />
          <Route path="/eventos/:id" element={<EventoDetalhesPage />} />
          <Route path="/eventos/:id/cardapio" element={<EventoCardapioPage />} />
          <Route path="/eventos/:id/vendas" element={<EventoVendasPage />} />
          <Route path="/registro-vendas" element={<RegistroVendasPage />} />
          <Route
            path="/registro-vendas/historico"
            element={<HistoricoVendasPage />}
          />
          <Route path="/caixa" element={<CaixaPage />} />
          <Route path="/caixa/fiado" element={<CaixaPage />} />
          <Route path="/caixa/fiados" element={<FiadosPage />} />
          <Route path="/relatorio-geral" element={<RelatorioGeralPage />} />
          <Route
            path="/relatorio-geral/fiados"
            element={<FiadosGeraisPage />}
          />
          <Route
            path="/em-definicao/painel-de-controle"
            element={<Navigate to="/relatorio-geral" replace />}
          />
          <Route
            path="/em-definicao/relatorio-geral"
            element={<Navigate to="/relatorio-geral" replace />}
          />
          <Route path="/em-definicao/:slug" element={<PaginaPendente />} />
          <Route path="*" element={<PaginaNaoEncontrada />} />
        </Route>
      </Route>
    </Routes>
  );
}
