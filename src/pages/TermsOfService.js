import React from 'react';

const TermsOfService = () => {
  return (
    <div style={styles.container}>
      <h1>이용약관</h1>
      <p>이곳은 서비스 이용약관 내용을 안내하는 페이지입니다.</p>
      <p>현재는 앱스토어에서 다운받은 앱을 통해 확인하실수 있습니다.</p>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'left',
  },
};

export default TermsOfService;
