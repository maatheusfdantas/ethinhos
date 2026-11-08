import React from 'react';
import { User, Sparkles } from 'lucide-react';

/**
 * Aba do Perfil do Usuário
 * Espaço reservado para personalização, estruturação futura e detalhes de identidade.
 */
export function ProfileTab({ user }) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Usuário';

  return (
    <div
      style={{
        width: '100%',
        minHeight: '520px',
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '32px',
        padding: '48px 32px',
        boxShadow: '0 14px 36px rgba(33, 31, 56, 0.08)',
        border: '1.5px solid rgba(255, 255, 255, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '14px',
        animation: 'ethosModalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '24px',
          backgroundColor: '#211F38',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(33, 31, 56, 0.25)',
          position: 'relative'
        }}
      >
        <User size={32} />
        <span
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            border: '2px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Online"
        />
      </div>

      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1A1B2F', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Perfil de {firstName}
        </h2>
        {user?.username && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '13px',
              fontWeight: 700,
              color: '#4F46E5',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              padding: '3px 10px',
              borderRadius: '999px',
              marginBottom: '8px'
            }}
          >
            @{user.username}
          </span>
        )}
      </div>

      <p style={{ fontSize: '13.5px', color: '#686687', maxWidth: '440px', margin: 0, lineHeight: 1.55 }}>
        Esta aba do perfil está pronta e disponível no sistema. A estrutura completa deste módulo será adicionada em breve.
      </p>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '12px',
          padding: '8px 18px',
          borderRadius: '999px',
          backgroundColor: 'rgba(33, 31, 56, 0.06)',
          fontSize: '12.5px',
          fontWeight: 600,
          color: '#56548A'
        }}
      >
        <Sparkles size={14} color="#6366F1" />
        <span>Espaço reservado para personalização</span>
      </div>
    </div>
  );
}
