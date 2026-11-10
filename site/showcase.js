const options = document.querySelectorAll('[data-option]');

for (const option of options) {
  option.addEventListener('click', () => {
    for (const button of options) {
      const selected = button === option;
      button.setAttribute('aria-pressed', String(selected));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
      document.getElementById(`map-${button.dataset.option}`).classList.toggle('map-option-hidden', !selected);
    }
  });
}
