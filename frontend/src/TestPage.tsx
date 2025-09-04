import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div className="bg-red-500 p-8">
      <h1 className="text-white text-4xl font-bold mb-4">
        Tailwind CSS Test
      </h1>
      <p className="text-white text-lg">
        Si ves este texto en blanco con fondo rojo, Tailwind CSS está funcionando.
      </p>
      <div className="mt-4 bg-blue-500 p-4 rounded-lg">
        <p className="text-white">
          Esta caja azul también debería aparecer si Tailwind funciona.
        </p>
      </div>
      <button className="btn-primary mt-4">
        Botón con clase personalizada
      </button>
    </div>
  );
};

export default TestPage;
