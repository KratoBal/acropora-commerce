export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <span className="eyebrow">Acropora</span>
        <h2>Tengeri akvarisztika, átgondoltan.</h2>
        <p>
          Ez a különálló Medusa storefront lab. A jelenlegi shop storefrontját
          nem módosítja.
        </p>
      </div>
      <div>
        <h3>Vásárlási információk</h3>
        <a href="https://shop.acropora.hu" rel="noreferrer" target="_blank">
          Szállítás és átvétel
        </a>
        <a href="https://shop.acropora.hu" rel="noreferrer" target="_blank">
          Elállás és garancia
        </a>
        <a href="https://shop.acropora.hu" rel="noreferrer" target="_blank">
          Kapcsolat
        </a>
      </div>
      <div>
        <h3>Fizetési lehetőségek</h3>
        <p>Bankkártya · Előre utalás · Utánvét</p>
        <div className="simplepay">SimplePay</div>
      </div>
    </footer>
  );
}
