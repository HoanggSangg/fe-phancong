export const normalizeSearchText = (str = '') =>
  String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

export const getWorkerLabel = (worker) => {
  if (!worker) return '';
  return `${worker.name || ''}${worker.soBaoDanh ? ` (SBD: ${worker.soBaoDanh})` : ''}`.trim();
};

export const filterWorkersByKeyword = (workers = [], keyword = '') => {
  const query = normalizeSearchText(keyword);
  if (!query) return workers;

  return workers.filter((worker) => {
    const name = normalizeSearchText(worker.name || '');
    const code = normalizeSearchText(worker.soBaoDanh || '');
    const phone = normalizeSearchText(worker.phone || '');
    const team = normalizeSearchText(worker.team?.name || '');
    return (
      name.includes(query)
      || code.includes(query)
      || phone.includes(query)
      || team.includes(query)
    );
  });
};
