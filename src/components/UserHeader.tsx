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
    // NUEVAS PROPS PARA EL ADMIN
    isAdmin?: boolean;
    onVerAdmin?: () => void;
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
    onVerCarrito,
    isAdmin,
    onVerAdmin
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

                {/* BOTÓN OCULTO DE ADMIN */}
                {isAdmin && onVerAdmin && (
                    <button className="btn" onClick={onVerAdmin} style={{ backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #eab308', gap: '6px' }}>
                        👑 Admin
                    </button>
                )}

                <button className="btn btn-secondary" onClick={onVerReporte} style={{ gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="20" x2="12" y2="10"></line>
                        <line x1="18" y1="20" x2="18" y2="4"></line>
                        <line x1="6" y1="20" x2="6" y2="16"></line>
                    </svg>
                    Reporte
                </button>

                <button className="btn btn-secondary" onClick={onVerPerfil} style={{ gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Mi Perfil
                </button>

                <button className="btn btn-secondary" onClick={onVerHistorial} style={{ gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
                    </svg>
                    Presupuestos
                </button>

                <button className="btn btn-secondary" onClick={onLogout}>Cerrar Sesión</button>
            </div>
        </div>
    )
}