/* Gallery page: folders open a project viewer (<dialog>); photos open full size on top. Vanilla JS. */
(function () {
  'use strict';

  var current = null; // open project dialog

  function openProject(slug, push) {
    var dlg = document.getElementById('p-' + slug);
    if (!dlg || typeof dlg.showModal !== 'function') return false;
    if (current && current !== dlg) current.close();
    if (!dlg.open) dlg.showModal();
    current = dlg;
    document.body.classList.add('pv-open');
    dlg.querySelector('.pv__body').scrollTop = 0;
    if (push) history.pushState({ project: slug }, '', '#' + slug);
    if (window.dataLayer) window.dataLayer.push({ event: 'gallery_open', project: slug });
    return true;
  }

  // Folder click: open in place (the #slug link still works without JS)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-folder]');
    if (!a) return;
    if (openProject(a.getAttribute('data-folder'), true)) e.preventDefault();
  });

  document.querySelectorAll('.pv').forEach(function (dlg) {
    dlg.addEventListener('close', function () {
      document.body.classList.remove('pv-open');
      if (current === dlg) current = null;
      // Drop the #slug so Back does not reopen it
      if (location.hash === '#' + dlg.id.slice(2)) history.replaceState(null, '', location.pathname + location.search);
    });
    dlg.addEventListener('click', function (e) {
      // Click on the backdrop (outside the sheet) or the close button
      if (e.target === dlg || e.target.closest('[data-pv-close]')) dlg.close();
    });
  });

  // Deep link (/gallery/#jimmy) and Back/Forward
  function fromHash() {
    var slug = location.hash.slice(1);
    if (slug && document.getElementById('p-' + slug)) openProject(slug, false);
    else if (current) current.close();
  }
  window.addEventListener('popstate', fromHash);
  fromHash();

  /* ---------- Full-size photo viewer with prev/next inside the open project ---------- */
  var photo = document.getElementById('pv-photo');
  if (!photo) return;
  var pImg = photo.querySelector('.pv-photo__img');
  var pCap = photo.querySelector('.pv-photo__cap');
  var shots = [], idx = 0;

  function show(i) {
    idx = (i + shots.length) % shots.length;
    var s = shots[idx], img = s.querySelector('img');
    var stage = s.closest('.pv__stage').querySelector('.h3').textContent;
    pImg.src = s.getAttribute('data-full');
    pImg.alt = img.alt;
    pCap.textContent = stage + ' · ' + (idx + 1) + ' / ' + shots.length;
  }

  document.addEventListener('click', function (e) {
    var s = e.target.closest('.pv__shot');
    if (!s) return;
    shots = Array.prototype.slice.call(s.closest('.pv').querySelectorAll('.pv__shot'));
    show(shots.indexOf(s));
    photo.showModal();
  });
  photo.addEventListener('click', function (e) {
    var step = e.target.closest('[data-photo-step]');
    if (step) return show(idx + Number(step.getAttribute('data-photo-step')));
    if (e.target === photo || e.target.closest('[data-photo-close]')) photo.close();
  });
  photo.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
  photo.addEventListener('close', function () { pImg.src = ''; });

  // Swipe on touch screens
  var x0 = null;
  photo.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  photo.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
