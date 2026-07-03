export const getWorkerLabel = (worker) => {
  if (!worker) return '';
  return `${worker.name || ''}${worker.soBaoDanh ? ` (SBD: ${worker.soBaoDanh})` : ''}`.trim();
};

export const filterWorkersByKeyword = (workers = [], keyword = '') => {
  const query = keyword.trim().toLowerCase();
  if (!query) return workers;

  return workers.filter((worker) => {
    const name = worker.name?.toLowerCase() || '';
    const code = String(worker.soBaoDanh || '').toLowerCase();
    const phone = String(worker.phone || '').toLowerCase();
    return name.includes(query) || code.includes(query) || phone.includes(query);
  });
};
