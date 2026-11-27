import { useEffect, useState } from 'react';

export default function useKeys() {
  const [keys, setKeys] = useState({});

  useEffect(() => {
    const down = event => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      setKeys(current => ({ ...current, [event.key.toLowerCase()]: true }));
    };
    const up = event => setKeys(current => ({ ...current, [event.key.toLowerCase()]: false }));

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return keys;
}
