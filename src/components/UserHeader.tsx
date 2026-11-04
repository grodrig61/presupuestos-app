// src/components/UserHeader.tsx
import type { Perfil } from '../types'

interface Props {
    perfil: Perfil;
    onVerHistorial: () => void;
    onVerPerfil: () => void;
    onVerReporte: () => void;
    onLogout: () => void;
    mostrarBotonVolver?: boolean;
    onVolver?: () => void;
    itemsCount?: number;
    onVerCarrito?: () => void;
}

export const UserHeader = ({
    perfil,
    onVerHistorial,
    onVerPerfil,
    onVerReporte,
    onLogout,
    mostrarBotonVolver,
    onVolver,
    itemsCount = 0,
    onVerCarrito
}: Props) => {
    return (
        <div className="user-header">
            <div className="user-info">
                {perfil.logo_url && <img src={perfil.logo_url} alt="Logo" className="user-logo" />}
                <div>
                    <h4>{perfil.nombre}</h4>
                    <p>CUIT: {perfil.cuit}</p>
                </div>
            </div>

            <div className="user-actions">
                {mostrarBotonVolver && (
                    <button className="btn btn-secondary" onClick={onVolver}>← Volver</button>
                )}

                {itemsCount > 0 && onVerCarrito && (
                    <button
                        className="btn"
                        onClick={onVerCarrito}
                        style={{
                            backgroundColor: '#0ea5e9',
                            color: 'white',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 4px rgba(14, 165, 233, 0.3)'
                        }}
                    >
                        🛒 Ver Carrito ({itemsCount})
                    </button>
                )}

                <button className="btn btn-secondary" onClick={onVerReporte}>📊 Reporte</button>
                <button className="btn btn-secondary" onClick={onVerPerfil}>👤 Mi Perfil</button>
                <button className="btn btn-secondary" onClick={onVerHistorial}>📁 Presupuestos</button>
                <button className="btn btn-secondary" onClick={onLogout}>Cerrar Sesión</button>
            </div>
        </div>
    )
}