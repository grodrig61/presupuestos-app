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
    // PROPS PARA EL CARRITO GLOBAL
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

                {/* BOTÓN DEL CARRITO: Elegante, con ícono SVG y Badge */}
                {itemsCount > 0 && onVerCarrito && (
                    <button
                        className="btn"
                        onClick={onVerCarrito}
                        style={{
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="8" cy="21" r="1" />
                            <circle cx="19" cy="21" r="1" />
                            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                        </svg>
                        Ver Carrito
                        <span style={{
                            backgroundColor: 'white',
                            color: 'var(--primary)',
                            borderRadius: '50%',
                            padding: '2px 7px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {itemsCount}
                        </span>
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