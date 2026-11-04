//! Executes approved requests (internal). (W-3.6)

use crate::types::RequestId;
use crate::Contract;

impl Contract {
    /// PayeePayment / LargeSpend → transfer; SetChildAccount → storage_deposit + set;
    /// ChildDeceased → redistribute share; Unpause → paused=false; VouchCancel → unlock 2nd cancel.
    pub(crate) fn execute_request(&mut self, request_id: RequestId) {
        let _ = request_id;
        todo!("W-3.6")
    }
}
